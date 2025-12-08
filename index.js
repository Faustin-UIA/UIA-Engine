/* UIA METRIC COLLECTOR V4 (OpenAI Mixed 360)
   Target: gpt-4o-mini (GitHub Actions)
   Goal: Capture the 13 Core Physics Metrics on a Randomized Stress Test.
*/

const fs = require('fs');
const promptsData = require('./prompts_uia.js');

// CONFIGURATION
const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL_NAME = "gpt-4o-mini";

// Handle Command Line Args (from Workflow)
const args = process.argv.slice(2);
let OUTPUT_FILE = "uia_openai_mixed_360.jsonl"; // Default

// Parse the --log="..." argument from the YAML workflow
args.forEach(arg => {
    if (arg.startsWith('--log=')) {
        OUTPUT_FILE = arg.split('=')[1];
    }
});

const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error("❌ ERROR: Missing OPENAI_API_KEY environment variable.");
    process.exit(1);
}

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

// Gini for OpenAI (using top_logprobs)
function calculateGini(topLogprobs) {
    if (!topLogprobs || topLogprobs.length < 2) return 0;
    // Convert logprobs to linear probabilities
    const probs = topLogprobs.map(t => Math.exp(t.logprob));
    
    // Normalize to sum to 1 (OpenAI top_logprobs might not sum to exactly 1)
    const sum = probs.reduce((a, b) => a + b, 0);
    const normalized = probs.map(p => p / sum);

    const n = normalized.length;
    let numerator = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            numerator += Math.abs(normalized[i] - normalized[j]);
        }
    }
    // Gini formula: Numerator / (2 * n^2 * mean)
    // Since we normalized sum to 1, mean = 1/n
    // Denominator = 2 * n * n * (1/n) = 2n
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
    // Fisher-Yates Shuffle
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
    
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [{ role: "user", content: item.prompt }],
                temperature: 0.2, // Low temp for physics stability
                max_tokens: 180,  // Match workflow limit
                logprobs: true,   // ENABLE PHYSICS DATA
                top_logprobs: 5   // Required for Gap/Gini calculation
            })
        });

        // F1: TTFB
        const firstTokenTick = performance.now();
        const ttfb = firstTokenTick - startTick;

        const data = await response.json();
        const endTick = performance.now();
        const totalDuration = endTick - startTick;

        if (data.error) {
            console.error(`API Error: ${data.error.message}`);
            return null;
        }

        // OpenAI Structure: data.choices[0].logprobs.content (Array of token objects)
        const contentTokens = data.choices?.[0]?.logprobs?.content || [];
        if (contentTokens.length === 0) return null;

        const tokenCount = contentTokens.length;

        // Map data arrays
        const entropies = contentTokens.map(t => calculateEntropy(t.logprob));
        
        // --- F2: SOFTMAX BOTTLENECK ---
        // Window: First 5 tokens
        const f2_window = entropies.slice(0, 5);
        const f2_spike = Math.max(...f2_window);
        const f2_mean = f2_window.reduce((a, b) => a + b, 0) / f2_window.length;

        // F2 Gini & Gap (Using the first token's top_logprobs)
        const firstTokenObj = contentTokens[0];
        let f2_gap = 0;
        let f2_gini = 0;

        if (firstTokenObj.top_logprobs && firstTokenObj.top_logprobs.length >= 2) {
            const p1 = Math.exp(firstTokenObj.top_logprobs[0].logprob);
            const p2 = Math.exp(firstTokenObj.top_logprobs[1].logprob);
            f2_gap = p1 - p2; // The Deadlock Margin
            f2_gini = calculateGini(firstTokenObj.top_logprobs);
        }

        // --- F4: FABULATION (KINETIC WORK) ---
        const rwi_total = entropies.reduce((a, b) => a + b, 0);

        // --- F3: ATTRACTOR STABILITY ---
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

        // SACR Ratio
        const sacr = (plateau_h > 0) ? (tokenCount / plateau_h) : tokenCount * 100;

        // --- CLOSURE VIOLENCE ---
        let closure_spike = 0;
        if (tokenCount > 5) {
            closure_spike = Math.max(...entropies.slice(-5));
        }

        const record = {
            id: id,
            phase: item.phase, // Keeps the A1-A9 label
            prompt: item.prompt.substring(0, 30),
            
            // F1
            ttfb_ms: ttfb.toFixed(2),
            total_time: totalDuration.toFixed(2),
            
            // F2
            f2_spike: f2_spike.toFixed(4),
            f2_gap: f2_gap.toFixed(4),
            f2_gini: f2_gini.toFixed(4),
            
            // F4
            tokens: tokenCount,
            rwi: rwi_total.toFixed(4),
            sacr: sacr.toFixed(2),
            
            // F3
            plateau_h: plateau_h.toFixed(4),
            f3_std: plateau_std.toFixed(4),
            
            // Closure
            closure_spike: closure_spike.toFixed(4)
        };

        console.log(`[${item.phase}] ID ${id} | F2 Spike: ${record.f2_spike} | Tokens: ${tokenCount} | Gini: ${record.f2_gini}`);
        return record;

    } catch (error) {
        console.error("Connection Error:", error.message);
        return null;
    }
}

// ---------------------------------------------------------
// 4. EXECUTION
// ---------------------------------------------------------
(async () => {
    console.log(`Starting UIA V4 (OpenAI Mixed) to: ${OUTPUT_FILE}`);
    fs.writeFileSync(OUTPUT_FILE, ""); 

    const deck = prepareMixedDeck();

    let globalCount = 0;
    // GitHub concurrency is handled by the OS (single thread here is safer for rate limits)
    for (const item of deck) {
        globalCount++;
        const result = await runProbe(item, globalCount);
        if (result) fs.appendFileSync(OUTPUT_FILE, JSON.stringify(result) + "\n");
        // Tiny delay to respect API rate limits
        await new Promise(r => setTimeout(r, 100));
    }
    console.log(`Done. Saved ${globalCount} records.`);
})();