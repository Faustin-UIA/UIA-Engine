/* UIA METRIC COLLECTOR V7 (Robust / Guaranteed Output)
   Target: GitHub Actions (OpenAI, Mistral, Gemini)
   Features:
   - Auto-detects Provider via ENV
   - Fallback logic for missing logprobs (saves record with 0.0 metrics)
   - Disables Safety Filters for Gemini to maximize data yield
   - Forces Mistral Large for better physics support
*/

import fs from 'fs';
import promptsData from './prompts_uia.js';

// --- CONFIGURATION ---
const PROVIDER = process.env.PROVIDER || 'openai'; 
let API_KEY = "";
let API_URL = "";
let DEFAULT_MODEL = "";

if (PROVIDER === 'google') {
    API_KEY = process.env.GOOGLE_API_KEY;
    DEFAULT_MODEL = "gemini-1.5-flash"; 
    console.log("🔵 MODE: GEMINI (GOOGLE)");
} else if (PROVIDER === 'mistral') {
    API_KEY = process.env.MISTRAL_API_KEY;
    API_URL = "https://api.mistral.ai/v1/chat/completions";
    // Force Large model for better logprob support
    DEFAULT_MODEL = "mistral-large-latest"; 
    console.log("🟠 MODE: MISTRAL AI");
} else {
    API_KEY = process.env.OPENAI_API_KEY;
    API_URL = "https://api.openai.com/v1/chat/completions";
    DEFAULT_MODEL = "gpt-4o-mini";
    console.log("🟢 MODE: OPENAI");
}

if (!API_KEY) {
    console.error(`❌ FATAL: Missing API Key for ${PROVIDER}`);
    process.exit(1);
}

const args = process.argv.slice(2);
let OUTPUT_FILE = `uia_${PROVIDER}_mixed_360.jsonl`;
let MODEL_NAME = DEFAULT_MODEL;

args.forEach(arg => {
    if (arg.startsWith('--log=')) OUTPUT_FILE = arg.split('=')[1];
    if (arg.startsWith('--model=')) MODEL_NAME = arg.split('=')[1];
});

// Dynamic URL for Gemini
if (PROVIDER === 'google') {
    API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
}

console.log(`🎯 TARGET: ${MODEL_NAME}`);
console.log(`📂 OUTPUT: ${OUTPUT_FILE}`);

// --- MATH ENGINE ---
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
    
    const probs = topCandidates.map(t => {
        const val = (t.logprob !== undefined) ? t.logprob : t.logProbability;
        return Math.exp(val);
    });

    const sum = probs.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;
    
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

// --- MIXER ENGINE ---
function prepareMixedDeck() {
    let deck = [];
    for (const [phase, list] of Object.entries(promptsData)) {
        list.forEach(prompt => {
            deck.push({ prompt: prompt, phase: phase });
        });
    }
    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// --- COLLECTOR ENGINE ---
async function runProbe(item, id) {
    const startTick = performance.now();
    let payload = {};
    let headers = { "Content-Type": "application/json" };

    if (PROVIDER === 'google') {
        payload = {
            contents: [{ parts: [{ text: item.prompt }] }],
            // Disable Safety Filters to prevent "Empty Candidate" errors
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 180,
                responseLogprobs: true // Request Physics Data
            }
        };
    } else {
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
            console.error(`❌ API FAIL [${item.phase}] ID ${id}: ${response.status} - ${errText.substring(0, 100)}`);
            // RETURN A FAILED RECORD (Don't return null)
            return {
                id: id, phase: item.phase, prompt: item.prompt.substring(0, 30),
                status: "failed_api", error: response.status,
                tokens: 0, ttfb_ms: 0
            };
        }

        const data = await response.json();
        const endTick = performance.now();
        const totalDuration = endTick - startTick;

        let contentTokens = [];
        let firstTokenObj = null;
        let missingLogprobs = false;

        // --- PARSING LOGIC ---
        if (PROVIDER === 'google') {
            const candidate = data.candidates?.[0];
            if (!candidate) {
                console.warn(`⚠️ Empty Candidate ID ${id}`);
                missingLogprobs = true;
            } else {
                const logRes = candidate.logprobsResult?.chosenCandidates;
                if (!logRes || logRes.length === 0) {
                    console.warn(`⚠️ NO LOGPROBS [Gemini] ID ${id}`);
                    missingLogprobs = true;
                } else {
                    contentTokens = logRes.map(t => ({ logprob: t.logProbability }));
                    if (logRes[0].topLogprobs) {
                        firstTokenObj = { top_logprobs: logRes[0].topLogprobs };
                    }
                }
            }
        } else {
            // OpenAI / Mistral
            contentTokens = data.choices?.[0]?.logprobs?.content || [];
            if (contentTokens.length === 0) {
                 console.warn(`⚠️ NO LOGPROBS [${PROVIDER}] ID ${id}`);
                 missingLogprobs = true;
                 // Try to fallback to text-only (for token count at least)
                 if (data.usage?.completion_tokens) {
                     // Create dummy tokens to allow partial data save
                     contentTokens = new Array(data.usage.completion_tokens).fill({ logprob: 0 });
                 }
            } else {
                firstTokenObj = contentTokens[0];
            }
        }

        // --- METRIC CALCULATION ---
        const tokenCount = contentTokens.length;
        
        let entropies = [];
        let f2_spike = 0, f2_mean = 0, f2_gap = 0, f2_gini = 0;
        let rwi_total = 0, plateau_h = 0, f3_std = 0, sacr = 0, closure_spike = 0;

        if (!missingLogprobs && tokenCount > 0) {
            entropies = contentTokens.map(t => calculateEntropy(t.logprob));
            
            // F2
            const f2_window = entropies.slice(0, 5);
            f2_spike = Math.max(...f2_window);
            f2_mean = f2_window.reduce((a, b) => a + b, 0) / f2_window.length;

            // Gap/Gini
            if (firstTokenObj && firstTokenObj.top_logprobs && firstTokenObj.top_logprobs.length >= 2) {
                const getLogProb = (t) => (t.logprob !== undefined) ? t.logprob : t.logProbability;
                const p1 = Math.exp(getLogProb(firstTokenObj.top_logprobs[0]));
                const p2 = Math.exp(getLogProb(firstTokenObj.top_logprobs[1]));
                f2_gap = p1 - p2; 
                f2_gini = calculateGini(firstTokenObj.top_logprobs);
            }

            // F4
            rwi_total = entropies.reduce((a, b) => a + b, 0);

            // F3
            if (tokenCount > 10) {
                const start = Math.floor(tokenCount * 0.25);
                const end = Math.floor(tokenCount * 0.75);
                const window = entropies.slice(start, end);
                plateau_h = window.reduce((a, b) => a + b, 0) / window.length;
                f3_std = calculateStdDev(window);
            } else {
                plateau_h = f2_mean; 
            }

            // Closure
            if (tokenCount > 5) {
                closure_spike = Math.max(...entropies.slice(-5));
            }
        }

        if (tokenCount > 0) {
            sacr = (plateau_h > 0) ? (tokenCount / plateau_h) : tokenCount * 100;
        }

        const record = {
            id: id,
            phase: item.phase,
            prompt: item.prompt.substring(0, 30),
            status: missingLogprobs ? "partial" : "success",
            ttfb_ms: ttfb.toFixed(2),
            total_time: totalDuration.toFixed(2),
            // Metrics (will be 0 if missing)
            f2_spike: f2_spike.toFixed(4),
            f2_gap: f2_gap.toFixed(4),
            f2_gini: f2_gini.toFixed(4),
            tokens: tokenCount,
            rwi: rwi_total.toFixed(4),
            sacr: sacr.toFixed(2),
            plateau_h: plateau_h.toFixed(4),
            f3_std: f3_std.toFixed(4),
            closure_spike: closure_spike.toFixed(4)
        };

        const logColor = missingLogprobs ? "⚠️" : "✅";
        console.log(`${logColor} [${item.phase}] ID ${id} | F2: ${record.f2_spike} | Tok: ${tokenCount}`);
        
        return record;

    } catch (error) {
        console.error("Probe Error:", error.message);
        return { id: id, status: "crashed", error: error.message };
    }
}

// --- EXECUTION ---
(async () => {
    console.log(`🚀 Starting UIA V7 (${PROVIDER.toUpperCase()}) to: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, ""); 

    const deck = prepareMixedDeck();
    console.log(`🃏 Deck Loaded: ${deck.length} prompts (Mixed)`);

    let globalCount = 0;
    
    for (const item of deck) {
        globalCount++;
        const result = await runProbe(item, globalCount);
        // GUARANTEED WRITE: Even if result is partial/error, we write it.
        if (result) {
            fs.appendFileSync(OUTPUT_FILE, JSON.stringify(result) + "\n");
        }
        await new Promise(r => setTimeout(r, 200));
    }
    console.log(`✅ Done. Saved ${globalCount} records.`);
})();