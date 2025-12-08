/* UIA METRIC COLLECTOR V7 (Universal: OpenAI, Mistral, Gemini)
   Target: GitHub Actions
   Goal: Capture 13 Core Physics Metrics across all major providers,
   with graceful fallback when token-level logprobs are missing.
*/

import fs from 'fs';
import promptsData from './prompts_uia.js';

// --- CONFIGURATION & ENV HANDLING ---
const PROVIDER = process.env.PROVIDER || 'openai';
let API_KEY = "";
let API_URL = "";
let DEFAULT_MODEL = "";

// Provider Adapters
if (PROVIDER === 'google') {
    API_KEY = process.env.GOOGLE_API_KEY;
    DEFAULT_MODEL = "gemini-1.5-flash"; // Fast & Efficient
    // URL is dynamic based on model, set later
    console.log("🔵 MODE: GEMINI (GOOGLE)");
} else if (PROVIDER === 'mistral') {
    API_KEY = process.env.MISTRAL_API_KEY;
    API_URL = "https://api.mistral.ai/v1/chat/completions";
    DEFAULT_MODEL = "mistral-small-latest";
    console.log("🟠 MODE: MISTRAL AI");
} else {
    API_KEY = process.env.OPENAI_API_KEY;
    API_URL = "https://api.openai.com/v1/chat/completions";
    DEFAULT_MODEL = "gpt-4o-mini";
    console.log("🟢 MODE: OPENAI");
}

if (!API_KEY) {
    console.error(`❌ ERROR: Missing API Key for provider ${PROVIDER}`);
    process.exit(1);
}

const args = process.argv.slice(2);
let OUTPUT_FILE = `uia_${PROVIDER}_mixed_360.jsonl`;
let MODEL_NAME = DEFAULT_MODEL;

args.forEach(arg => {
    if (arg.startsWith('--log=')) OUTPUT_FILE = arg.split('=')[1];
    if (arg.startsWith('--model=')) MODEL_NAME = arg.split('=')[1];
});

// Gemini URL needs the model name embedded
if (PROVIDER === 'google') {
    API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
}

console.log(`🎯 TARGET: ${MODEL_NAME}`);
console.log(`📂 OUTPUT: ${OUTPUT_FILE}`);

// ---------------------------------------------------------
// 1. MATH ENGINE
// ---------------------------------------------------------
function calculateEntropy(logprob) {
    if (logprob === undefined || logprob === null) return 0;
    const p = Math.exp(logprob);
    if (p <= 0) return 0;
    return -1 * Math.log2(p);
}

function calculateStdDev(arr) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
}

function calculateGini(topCandidates) {
    if (!topCandidates || topCandidates.length < 2) return 0;

    // Normalize probabilities
    const probs = topCandidates.map(t => Math.exp(t.logprob || t.logProbability || 0));
    const sum = probs.reduce((a, b) => a + b, 0) || 1;
    const normalized = probs.map(p => p / sum);

    const n = normalized.length;
    let numerator = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            numerator += Math.abs(normalized[i] - normalized[j]);
        }
    }
    return numerator / (2 * n);
}

// Very rough token approximation from plain text (fallback for providers without logprobs)
function approximateTokenCountFromText(text) {
    if (!text) return 1;
    const parts = text.split(/\s+/).filter(Boolean);
    return Math.max(parts.length, 1);
}

// ---------------------------------------------------------
// 2. MIXER ENGINE
// ---------------------------------------------------------
function prepareMixedDeck() {
    let deck = [];
    for (const [phase, list] of Object.entries(promptsData)) {
        list.forEach(prompt => {
            deck.push({ prompt: prompt, phase: phase });
        });
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// ---------------------------------------------------------
// 3. COLLECTOR ENGINE
// ---------------------------------------------------------
async function runProbe(item, id) {
    const startTick = performance.now();

    let payload = {};
    let headers = { "Content-Type": "application/json" };

    // ADAPTER: Payload Construction
    if (PROVIDER === 'google') {
        payload = {
            contents: [{ parts: [{ text: item.prompt }] }],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 180,
                // Try to ask for logprobs; if unavailable, we will gracefully fallback.
                responseLogprobs: true,
                // Some deployments use "logprobs" instead of responseLogprobs; harmless if ignored.
                logprobs: 5
            }
        };
        // Google passes key in URL, auth header not required
    } else {
        // OpenAI / Mistral Standard
        payload = {
            model: MODEL_NAME,
            messages: [{ role: "user", content: item.prompt }],
            temperature: 0.2,
            max_tokens: 180,
            logprobs: true,
            top_logprobs: 5
        };
        headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        const firstTokenTick = performance.now();
        const ttfb = firstTokenTick - startTick;

        if (!response.ok) {
            const errText = await response.text();
            console.error(`API Error (${response.status}): ${errText}`);
            return null;
        }

        const data = await response.json();
        const endTick = performance.now();
        const totalDuration = endTick - startTick;

        // ADAPTER: Response Parsing
        let contentTokens = [];
        let firstTokenObj = null;
        let rawText = "";
        let missingLogprobs = false;

        if (PROVIDER === 'google') {
            // GEMINI PARSING
            const candidate = data.candidates?.[0];
            if (!candidate) {
                console.warn(`⚠️ [Gemini] No candidates for ID ${id}`);
                return null;
            }

            // Extract raw text for tokenCount approximation
            if (candidate.content && Array.isArray(candidate.content)) {
                rawText = candidate.content
                    .map(block =>
                        (block.parts || [])
                            .map(p => p.text || "")
                            .join("")
                    )
                    .join("\n");
            } else if (candidate.outputText) {
                rawText = candidate.outputText;
            }

            // Gemini logprobs (if present)
            const logRes = candidate.logprobsResult?.chosenCandidates || [];
            if (logRes.length > 0) {
                // Each chosenCandidate has token-level probabilities
                contentTokens = logRes.map(t => ({ logprob: t.logProbability }));
                // For Gap/Gini, some variants provide topLogprobs per token:
                if (logRes[0].topLogprobs && logRes[0].topLogprobs.length >= 2) {
                    firstTokenObj = {
                        top_logprobs: logRes[0].topLogprobs
                    };
                }
            }

        } else {
            // OPENAI / MISTRAL PARSING
            const choice = data.choices?.[0];
            if (!choice) {
                console.warn(`⚠️ [${PROVIDER}] No choices for ID ${id}`);
                return null;
            }

            // Extract raw text from message
            rawText = choice.message?.content || "";

            // Try OpenAI-style logprobs.content
            const lp = choice.logprobs;
            if (lp && Array.isArray(lp.content) && lp.content.length > 0) {
                contentTokens = lp.content;
                firstTokenObj = contentTokens[0];
            }
            // If provider uses a different structure, you could add more branches here.
        }

        // -------------------------------------------------
        // "UNSTRICT" FALLBACK: if no token-level logprobs,
        // approximate tokens from text and synthesize entropy.
        // -------------------------------------------------
        if (contentTokens.length === 0) {
            missingLogprobs = true;

            const approxTokens = approximateTokenCountFromText(rawText);
            // synthesize a flat entropy profile (~1 bit per token)
            const fakeLogprob = -1; // ln(1/e) ≈ -1, entropy ~1.44 bits, but relative values are what matter.
            contentTokens = Array.from({ length: approxTokens }, () => ({ logprob: fakeLogprob }));

            // We have no top-logprobs; F2 gap/gini will stay 0.
            firstTokenObj = null;

            console.warn(`⚠️ [${PROVIDER}] Missing logprobs for ID ${id}, synthesized ${approxTokens} tokens.`);
        }

        const tokenCount = contentTokens.length;
        const entropies = contentTokens.map(t => calculateEntropy(t.logprob));

        // --- PHYSICS METRICS ---

        // F2: Softmax Bottleneck (early-window stats)
        const f2_window = entropies.slice(0, Math.min(5, entropies.length));
        const f2_spike = f2_window.length > 0 ? Math.max(...f2_window) : 0;
        const f2_mean = f2_window.length > 0
            ? f2_window.reduce((a, b) => a + b, 0) / f2_window.length
            : 0;

        // Gap & Gini
        let f2_gap = 0;
        let f2_gini = 0;

        if (firstTokenObj && firstTokenObj.top_logprobs && firstTokenObj.top_logprobs.length >= 2) {
            const cand0 = firstTokenObj.top_logprobs[0];
            const cand1 = firstTokenObj.top_logprobs[1];
            const lp0 = cand0.logprob || cand0.logProbability || 0;
            const lp1 = cand1.logprob || cand1.logProbability || 0;
            const p1 = Math.exp(lp0);
            const p2 = Math.exp(lp1);
            f2_gap = p1 - p2;
            f2_gini = calculateGini(firstTokenObj.top_logprobs);
        }

        // F4: Kinetic Work
        const rwi_total = entropies.reduce((a, b) => a + b, 0);

        // F3: Attractor Stability (Plateau window in mid 50%)
        let plateau_h = 0, plateau_std = 0;
        if (tokenCount > 10) {
            const start = Math.floor(tokenCount * 0.25);
            const end = Math.floor(tokenCount * 0.75);
            const window = entropies.slice(start, end);
            if (window.length > 0) {
                plateau_h = window.reduce((a, b) => a + b, 0) / window.length;
                plateau_std = calculateStdDev(window);
            }
        } else {
            plateau_h = f2_mean;
            plateau_std = 0;
        }

        const sacr = (plateau_h > 0) ? (tokenCount / plateau_h) : tokenCount * 100;

        // Closure: last tokens spike
        let closure_spike = 0;
        if (tokenCount > 0) {
            const tail = entropies.slice(-Math.min(5, tokenCount));
            closure_spike = Math.max(...tail);
        }

        const record = {
            id: id,
            phase: item.phase,
            prompt: item.prompt.substring(0, 120), // longer for debugging if needed
            provider: PROVIDER,
            model: MODEL_NAME,
            ttfb_ms: Number(ttfb.toFixed(2)),
            total_time_ms: Number(totalDuration.toFixed(2)),
            f2_spike: Number(f2_spike.toFixed(4)),
            f2_mean: Number(f2_mean.toFixed(4)),
            f2_gap: Number(f2_gap.toFixed(4)),
            f2_gini: Number(f2_gini.toFixed(4)),
            tokens: tokenCount,
            rwi: Number(rwi_total.toFixed(4)),
            sacr: Number(sacr.toFixed(2)),
            plateau_h: Number(plateau_h.toFixed(4)),
            f3_std: Number(plateau_std.toFixed(4)),
            closure_spike: Number(closure_spike.toFixed(4)),
            missingLogprobs: missingLogprobs
        };

        console.log(
            `[${item.phase}] ID ${id} | Tok: ${tokenCount} | F2: ${record.f2_spike} | Gini: ${record.f2_gini} | missingLogprobs=${missingLogprobs}`
        );
        return record;

    } catch (error) {
        console.error("Probe Error:", error.message);
        return null;
    }
}

// ---------------------------------------------------------
// 4. EXECUTION
// ---------------------------------------------------------
(async () => {
    console.log(`🚀 Starting UIA V7 (${PROVIDER.toUpperCase()}) to: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, ""); 

    const deck = prepareMixedDeck();
    console.log(`🃏 Deck Loaded: ${deck.length} prompts (Mixed)`);

    let writtenCount = 0;
    let attemptedCount = 0;

    // Serial execution for safety / rate limits
    for (const item of deck) {
        attemptedCount++;
        const result = await runProbe(item, attemptedCount);
        if (result) {
            fs.appendFileSync(OUTPUT_FILE, JSON.stringify(result) + "\n");
            writtenCount++;
        }
        // Rate limit kindness
        await new Promise(r => setTimeout(r, 250));
    }

    console.log(`✅ Done. Attempted: ${attemptedCount}, Saved: ${writtenCount} records.`);
})();
