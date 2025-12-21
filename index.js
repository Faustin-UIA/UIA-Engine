// ==============================================================================
// UIA Engine v4.6 - UNIVERSAL STRESS TESTER (GitHub Actions Compatible)
// Compatible with: @google/generative-ai (AI Studio)
// ==============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { performance } from "node:perf_hooks";

// --- SDK IMPORTS ---
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CORE UTILITIES ---
const { promises: fsPromises } = fs; 
let logFileHandle = null;

const __filename = fileURLToPath(import.meta.url);
const logCritical = (msg) => { console.log(`[CRITICAL LOG] ${new Date().toISOString()}: ${msg}`); };

// --- DYNAMIC CONFIGURATION ---
// Parse args: node index.js --log="results/..." --model="gemini-2.5-flash"
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [k, v] = arg.split('=');
    if (k && v) acc[k.replace('--', '')] = v;
    return acc;
}, {});

// CRITICAL: Use the log path passed from YAML, or fallback to root
const LOG_PATH   = args.log      || "uia_stress_results.jsonl";
const PROVIDER   = args.provider || "gemini"; 
const MODEL_NAME = args.model    || "gemini-2.5-flash";
const API_KEY    = process.env.GEMINI_API_KEY;

// --- JOB GENERATOR ---
function buildJobs() { 
    return [
        { A: 'QA1', idx: 0, text: 'Hello, confirm you are active.' }, 
        { A: 'QA4', idx: 1, text: 'Explain the concept of "recursion" in one sentence.' },
        { A: 'QA9', idx: 2, text: 'Compress this text to 3 keywords: [System initialization sequence complete. All systems green.]' },
        // Add more stress jobs here
    ]; 
}

// --- ROBUST FILE APPENDER ---
const appendJsonl = async (obj) => { 
    if (logFileHandle) {
        await logFileHandle.write(JSON.stringify(obj) + "\n"); 
    }
};

// ==============================================================================
// UNIVERSAL LLM ADAPTER
// ==============================================================================
async function callLLM({ messages, model }) {
    const t0 = performance.now();
    let outputText = "";
    let metrics = {};

    try {
        if (PROVIDER === "gemini") {
            // --- GEMINI (AI STUDIO SDK) ---
            // This works with your existing GEMINI_API_KEY secret
            if (!API_KEY) throw new Error("GEMINI_API_KEY is missing in environment variables!");
            
            const genAI = new GoogleGenerativeAI(API_KEY);
            const geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });
            
            const prompt = messages[messages.length - 1].content;
            const result = await geminiModel.generateContent(prompt);
            const response = await result.response;
            
            outputText = response.text();
            
            metrics = {
                "Total time (ms)": performance.now() - t0,
                "Token count": response.usageMetadata?.totalTokenCount || 0,
                "raw_logprob_vector_count": 0 
            };
        } else {
            // Simulation fallback
            await new Promise(r => setTimeout(r, 200));
            outputText = "Simulated response";
            metrics = { "Total time (ms)": 200, "Token count": 10 };
        }

        return { text: outputText, metrics, phases: {}, model_effective: model };

    } catch (e) {
        logCritical(`[API ERROR] ${e.message}`);
        return { text: "ERROR", metrics: { "Total time (ms)": 0 }, error: e.message };
    }
}

// -----------------------------------------------------
// --- MAIN RUNNER ---
// -----------------------------------------------------
async function main() {
    // --- STEP 1: ENSURE DIRECTORY EXISTS ---
    // If LOG_PATH is "results/uia...", we must ensure "results" folder exists
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // --- STEP 2: OPEN PERSISTENT HANDLE ---
    try {
        logFileHandle = await fsPromises.open(LOG_PATH, "a");
        logCritical(`[INIT] Writing to log: ${LOG_PATH}`);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    const jobs = buildJobs();
    logCritical(`Starting Run [${PROVIDER}::${MODEL_NAME}]. Jobs: ${jobs.length}`);

    let success = 0;
    for (const job of jobs) {
        const messages = [{ role: "user", content: job.text }];
        const res = await callLLM({ messages, model: MODEL_NAME });
        
        const logPayload = {
            event: "PROMPT_RESULT",
            A: job.A,
            "Total_time_ms": res.metrics["Total time (ms)"],
            "output_preview": res.text ? res.text.substring(0, 50).replace(/\n/g, " ") : "ERR"
        };
        await appendJsonl(logPayload);
        success++;
        logCritical(`[ok] ${job.A}:${job.idx} | ${Math.round(res.metrics["Total time (ms)"])}ms`);
    }
    
    await logFileHandle.close();
    logCritical(`DONE. Logs saved.`);
}

main().catch(async (e) => {
    console.error(e);
    if (logFileHandle) await logFileHandle.close().catch(() => {});
    process.exit(1);
});