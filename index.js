/* UIA METRIC COLLECTOR V6 (Universal: OpenAI, Mistral, Gemini)
   Target: GitHub Actions
   Goal: Capture 13 Core Physics Metrics across all major providers.
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
    const probs = topCandidates.map(t => Math.exp(t.logprob || t.logProbability));
    const sum = probs.reduce((a, b) => a + b, 0);
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
                responseLogprobs: true // Critical for Physics Data
            }
        };
        // Google passes Key in URL, no header needed for auth
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

        if (PROVIDER === 'google') {
            // Google Parsing
            const candidate = data.candidates?.[0];
            if (!candidate) return null;
            
            // Gemini puts logprobs in 'logprobsResult.chosenCandidates'
            // Each has 'logProbability' (note naming diff)
            const logRes = candidate.logprobsResult?.chosenCandidates || [];
            contentTokens = logRes.map(t => ({ logprob: t.logProbability }));
            
            // For Gap/Gini, Gemini provides 'topLogprobs' array inside chosenCandidate
            if (logRes.length > 0) {
                firstTokenObj = {
                    top_logprobs: logRes[0].topLogprobs // array of {token, logProbability}
                };
            }
        } else {
            // OpenAI / Mistral Parsing
            contentTokens = data.choices?.[0]?.logprobs?.content || [];
            if (contentTokens.length > 0) {
                firstTokenObj = contentTokens[0];
            }
        }

        if (contentTokens.length === 0) return null;

        const tokenCount = contentTokens.length;
        const entropies = contentTokens.map(t => calculateEntropy(t.logprob));
        
        // --- PHYSICS METRICS ---
        
        // F2: Softmax Bottleneck
        const f2_window = entropies.slice(0, 5);
        const f2_spike = Math.max(...f2_window);
        const f2_mean = f2_window.reduce((a, b) => a + b, 0) / f2_window.length;
        
        // Gap & Gini
        let f2_gap = 0;
        let f2_gini = 0;

        // Unified Gini Logic
        if (firstTokenObj && firstTokenObj.top_logprobs && firstTokenObj.top_logprobs.length >= 2) {
            // Normalize key names (OpenAI: logprob, Google: logProbability)
            const p1 = Math.exp(firstTokenObj.top_logprobs[0].logprob || firstTokenObj.top_logprobs[0].logProbability);
            const p2 = Math.exp(firstTokenObj.top_logprobs[1].logprob || firstTokenObj.top_logprobs[1].logProbability);
            f2_gap = p1 - p2; 
            f2_gini = calculateGini(firstTokenObj.top_logprobs);
        }

        // F4: Kinetic Work
        const rwi_total = entropies.reduce((a, b) => a + b, 0);

        // F3: Attractor Stability
        let plateau_h = 0, plateau_std = 0;
        if (tokenCount > 10) {
            const start = Math.floor(tokenCount * 0.25);
            const end = Math.floor(tokenCount * 0.75);
            const window = entropies.slice(start, end);
            plateau_h = window.reduce((a, b) => a + b, 0) / window.length;
            plateau_std = calculateStdDev(window);
        } else {
            plateau_h = f2_mean; 
        }

        const sacr = (plateau_h > 0) ? (tokenCount / plateau_h) : tokenCount * 100;

        // Closure
        let closure_spike = 0;
        if (tokenCount > 5) {
            closure_spike = Math.max(...entropies.slice(-5));
        }

        const record = {
            id: id,
            phase: item.phase,
            prompt: item.prompt.substring(0, 30),
            ttfb_ms: ttfb.toFixed(2),
            total_time: totalDuration.toFixed(2),
            f2_spike: f2_spike.toFixed(4),
            f2_gap: f2_gap.toFixed(4),
            f2_gini: f2_gini.toFixed(4),
            tokens: tokenCount,
            rwi: rwi_total.toFixed(4),
            sacr: sacr.toFixed(2),
            plateau_h: plateau_h.toFixed(4),
            f3_std: plateau_std.toFixed(4),
            closure_spike: closure_spike.toFixed(4)
        };

        console.log(`[${item.phase}] ID ${id} | F2: ${record.f2_spike} | Tok: ${tokenCount} | Gini: ${record.f2_gini}`);
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
    console.log(`🚀 Starting UIA V6 (${PROVIDER.toUpperCase()}) to: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, ""); 

    const deck = prepareMixedDeck();
    console.log(`🃏 Deck Loaded: ${deck.length} prompts (Mixed)`);

    let globalCount = 0;
    
    // Serial execution for safety
    for (const item of deck) {
        globalCount++;
        const result = await runProbe(item, globalCount);
        if (result) fs.appendFileSync(OUTPUT_FILE, JSON.stringify(result) + "\n");
        // Rate limit kindness
        await new Promise(r => setTimeout(r, 250));
    }
    console.log(`✅ Done. Saved ${globalCount} records.`);
})();