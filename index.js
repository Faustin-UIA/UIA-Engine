// ==============================================================================
// UIA Engine v4.1 (Universal Provider Edition)
// SUPPORTS: OpenAI (ChatGPT) and Google (Gemini)
// OUTPUT: Strict JSONL format compatible with UIA Manifold Calculation v2.0
// ==============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { performance } from "node:perf_hooks";

// --- TOGGLE PROMPTS HERE ---
// To run Positive: uncomment positive, comment stress
import all_prompts from "./prompts_positive_uia.js";
// To run Stress: uncomment stress, comment positive
// import all_prompts from "./prompts_stress_uia.js";

const { promises: fsPromises } = fs;

// SDK Placeholders (Lazy Loaded)
let OpenAI = null;
let GoogleAI = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// --- CLI & ENV PARSER ---
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const LOG_PATH   = arg("log", "results/uia_run.jsonl");
const ARG_MODEL  = arg("model", process.env.MODEL || "gpt-4o");
const ARG_CONC   = parseInt(arg("concurrency", "1"), 10);
const PROVIDER   = (arg("provider", process.env.PROVIDER || "openai")).toLowerCase();
const API_KEY    = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

// --- DELAY FUNCTION (Used by your YAML Patch) ---
// Your YAML sed command looks for "await delay(200);" to replace it.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(`=== UIA Engine v4.1 ===`);
console.log(`Provider: ${PROVIDER} | Model: ${ARG_MODEL}`);
console.log(`Concurrency: ${ARG_CONC}`);

// --- LOGGING ---
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
const appendJsonl = async (p, obj) => {
  try { await fsPromises.appendFile(p, JSON.stringify(obj) + "\n"); } 
  catch (e) { console.error(`Write Error: ${e.message}`); }
};

// ==============================================================================
// METRIC CALCULATORS (EXACTLY MATCHING CHATGPT LOGIC)
// ==============================================================================
const nowPerf  = () => performance.now();
const mean     = a => (a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0);
const p95      = a => (a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(0.95*(a.length-1))] : 0);
const norm     = v => { const s=v.reduce((a,b,)=>a+b,0)||1; return v.map(x=>x/s); };
const Hshannon = p => -p.reduce((s,x)=> s + (x>0 ? x*Math.log2(x) : 0), 0);

function lexicalEntropyForText(s, W=10){
  const toks = s.split(/\s+/).filter(Boolean);
  const Hs=[];
  for (let i=0;i<toks.length;i++){
    const win=toks.slice(Math.max(0,i-W+1), i+1);
    const counts=Object.values(win.reduce((m,w)=>(m[w]=(m[w]||0)+1,m),{}));
    Hs.push(Hshannon(norm(counts)));
  }
  return { mean_H: +mean(Hs).toFixed(3), p95_H: +p95(Hs).toFixed(3), tokens: toks.length };
}

function finalizeMetrics(meter) {
    const total_ms = +((meter.last - meter.t0).toFixed(2));
    const tok_lat = meter.gaps.slice(1);
    const ent = lexicalEntropyForText(meter.text);
    
    // Forensic Refusal Check (Standardized)
    const refusalKeywords = /\b(cannot|unable|apologize|sorry|safety|language model|violate)\b/gi;
    const refusalMatches = (meter.text.match(refusalKeywords) || []).length;

    return {
        total_ms, 
        token_count: ent.tokens,
        output_text_sha: crypto.createHash("sha1").update(meter.text).digest("hex").slice(0,12),
        entropy: { mean: ent.mean_H, p95: ent.p95_H },
        latency: { mean: +mean(tok_lat).toFixed(2), p95: +p95(tok_lat).toFixed(2) },
        forensics: { 
            refusal: { has_refusal: refusalMatches > 0, refusal_score: refusalMatches } 
        }
    };
}

// --- STREAM TIMER ---
function startStreamTimer(){
  return { t0: nowPerf(), firstAt: null, last: nowPerf(), gaps: [], text: "" };
}
function onChunkTimer(st, chunk=""){
  const t = nowPerf();
  if (st.firstAt === null) { st.firstAt = t; st.gaps.push(t - st.t0); } 
  else { st.gaps.push(t - st.last); }
  st.last = t; 
  if (chunk) st.text += chunk;
}

// ==============================================================================
// PROVIDER ADAPTERS
// ==============================================================================
async function callLLM(text, model) {
    const meter = startStreamTimer();

    // --- GEMINI ADAPTER ---
    if (PROVIDER === "gemini") {
        if (!GoogleAI) { 
            const mod = await import("@google/generative-ai");
            GoogleAI = mod.GoogleGenerativeAI;
        }
        const genAI = new GoogleAI(API_KEY);
        const geminiModel = genAI.getGenerativeModel({ model: model });
        
        try {
            const result = await geminiModel.generateContentStream(text);
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                onChunkTimer(meter, chunkText);
            }
        } catch (e) {
            throw new Error(`Gemini Error: ${e.message}`);
        }
    } 
    // --- OPENAI ADAPTER (Legacy Support) ---
    else if (PROVIDER === "openai") {
        if (!OpenAI) { 
            const mod = await import("openai");
            OpenAI = mod.default;
        }
        const client = new OpenAI({ apiKey: API_KEY });
        const stream = await client.chat.completions.create({
            model: model, messages: [{role: "user", content: text}], stream: true
        });
        for await (const chunk of stream) {
            const part = chunk.choices[0]?.delta?.content || "";
            if (part) onChunkTimer(meter, part);
        }
    } 
    else {
        throw new Error(`Unknown Provider: ${PROVIDER}`);
    }

    return { metrics: finalizeMetrics(meter) };
}

// ==============================================================================
// MAIN EXECUTION LOOP
// ==============================================================================
function transformPrompts(flatList) {
    const grouped = {};
    flatList.forEach(item => {
        if (!grouped[item.phase]) grouped[item.phase] = [];
        grouped[item.phase].push(item.prompt);
    });
    return grouped;
}
const PROMPTS = transformPrompts(all_prompts);

async function run() {
  await appendJsonl(LOG_PATH, { event: "RUN_START", model: ARG_MODEL, provider: PROVIDER, ts: new Date().toISOString() });

  // Determine Scope (QA1-QA9 or A1-A9)
  const phases = Object.keys(PROMPTS).sort();
  
  for (const phase of phases) {
    const items = PROMPTS[phase];
    console.log(`Processing ${phase} (${items.length} prompts)...`);
    
    for (let i = 0; i < items.length; i++) {
        const text = items[i];
        
        // --- RATE LIMIT PATCH TARGET ---
        // The GitHub Action will find this line and replace 200 with 25000
        await delay(200); 
        // -------------------------------

        try {
            const res = await callLLM(text, ARG_MODEL);
            await appendJsonl(LOG_PATH, {
                event: "FORENSIC_RESULT", 
                A: phase, 
                prompt_id: `${phase}:${i}`, 
                metrics: res.metrics 
            });
            console.log(`[OK] ${phase}:${i}`);
        } catch (e) {
            console.error(`[ERR] ${phase}:${i} :: ${e.message}`);
        }
    }
  }
  console.log("Run Complete.");
}

run();