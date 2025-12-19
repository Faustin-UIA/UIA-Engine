// ==============================================================================
// UIA Engine v5.0 (The Universal Adapter)
// SUPPORTS: OpenAI, Gemini, Mistral (Native), Claude (Native)
// ==============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { performance } from "node:perf_hooks";

// --- PROMPT SELECTOR (TOGGLE THIS FOR RUN 1 vs RUN 2) ---
import all_prompts from "./prompts_positive_uia.js"; 
// import all_prompts from "./prompts_stress_uia.js";

const { promises: fsPromises } = fs;

// --- CONFIG ---
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const LOG_PATH  = arg("log", "results/uia_run.jsonl");
const MODEL     = arg("model", process.env.MODEL || "mistral-small-latest");
const PROVIDER  = (arg("provider", process.env.PROVIDER || "mistral")).toLowerCase();
const CONC      = parseInt(arg("concurrency", "1"), 10);

// Detect API Key based on Provider
let API_KEY = "";
if (PROVIDER === "mistral") API_KEY = process.env.MISTRAL_API_KEY;
else if (PROVIDER === "anthropic") API_KEY = process.env.ANTHROPIC_API_KEY;
else if (PROVIDER === "gemini") API_KEY = process.env.GEMINI_API_KEY;
else API_KEY = process.env.OPENAI_API_KEY;

// Global delay function (Used for Rate Limiting patches)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(`=== UIA Engine v5.0 ===`);
console.log(`Provider: ${PROVIDER} | Model: ${MODEL}`);

// --- METRICS ENGINE (UNCHANGED) ---
const nowPerf = () => performance.now();
const mean    = a => (a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0);
const p95     = a => (a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(0.95*(a.length-1))] : 0);
const norm    = v => { const s=v.reduce((a,b)=>a+b,0)||1; return v.map(x=>x/s); };
const Hshannon= p => -p.reduce((s,x)=> s + (x>0 ? x*Math.log2(x) : 0), 0);

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
    const refusalKeywords = /\b(cannot|unable|apologize|sorry|safety|language model|violate|ethic)\b/gi;
    const refusalMatches = (meter.text.match(refusalKeywords) || []).length;

    return {
        total_ms, 
        token_count: ent.tokens,
        output_text_sha: crypto.createHash("sha1").update(meter.text).digest("hex").slice(0,12),
        entropy: { mean: ent.mean_H, p95: ent.p95_H },
        latency: { mean: +mean(tok_lat).toFixed(2), p95: +p95(tok_lat).toFixed(2) },
        forensics: { refusal: { has_refusal: refusalMatches > 0, refusal_score: refusalMatches } }
    };
}

function startStreamTimer(){ return { t0: nowPerf(), firstAt: null, last: nowPerf(), gaps: [], text: "" }; }
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
async function callLLM(prompt, model) {
    const meter = startStreamTimer();
    
    // --- 1. MISTRAL (Native Fetch) ---
    if (PROVIDER === "mistral") {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: model, messages: [{role:"user", content: prompt}], stream: true })
        });
        if (!res.ok) throw new Error(`Mistral API Error: ${res.status} ${res.statusText}`);
        
        // Parse SSE
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                        const json = JSON.parse(data);
                        const txt = json.choices[0]?.delta?.content || "";
                        if (txt) onChunkTimer(meter, txt);
                    } catch(e) {}
                }
            }
        }
    }

    // --- 2. ANTHROPIC / CLAUDE (Native Fetch) ---
    else if (PROVIDER === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { 
                "x-api-key": API_KEY, 
                "anthropic-version": "2023-06-01", 
                "content-type": "application/json" 
            },
            body: JSON.stringify({ 
                model: model, 
                messages: [{role:"user", content: prompt}], 
                max_tokens: 1024,
                stream: true 
            })
        });
        if (!res.ok) throw new Error(`Claude API Error: ${res.status} ${res.statusText}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith("event: content_block_delta")) {
                    // The next line is usually "data: {...}"
                    continue;
                }
                if (line.startsWith("data: ")) {
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.delta && json.delta.text) {
                            onChunkTimer(meter, json.delta.text);
                        }
                    } catch(e) {}
                }
            }
        }
    }

    // --- 3. GOOGLE GEMINI (Legacy SDK) ---
    else if (PROVIDER === "gemini") {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(API_KEY);
        const mod = genAI.getGenerativeModel({ model: model });
        const result = await mod.generateContentStream(prompt);
        for await (const chunk of result.stream) {
            onChunkTimer(meter, chunk.text());
        }
    }

    // --- 4. OPENAI (Legacy SDK) ---
    else {
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({ apiKey: API_KEY });
        const stream = await client.chat.completions.create({
            model: model, messages: [{role: "user", content: prompt}], stream: true
        });
        for await (const chunk of stream) {
            const part = chunk.choices[0]?.delta?.content || "";
            if (part) onChunkTimer(meter, part);
        }
    }

    return { metrics: finalizeMetrics(meter) };
}

// ==============================================================================
// RUNNER
// ==============================================================================
const PROMPTS = {};
all_prompts.forEach(x => {
    if (!PROMPTS[x.phase]) PROMPTS[x.phase] = [];
    PROMPTS[x.phase].push(x.prompt);
});

async function run() {
  await fsPromises.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fsPromises.appendFile(LOG_PATH, JSON.stringify({ event: "RUN_START", model: MODEL, provider: PROVIDER, ts: new Date().toISOString() }) + "\n");

  const phases = Object.keys(PROMPTS).sort();
  for (const phase of phases) {
    const items = PROMPTS[phase];
    console.log(`Processing ${phase} (${items.length})...`);
    for (let i = 0; i < items.length; i++) {
        await delay(1000); // Standard 1s delay (Overwritable by YAML patch)
        try {
            const res = await callLLM(items[i], MODEL);
            await fsPromises.appendFile(LOG_PATH, JSON.stringify({ 
                event: "FORENSIC_RESULT", A: phase, prompt_id: `${phase}:${i}`, metrics: res.metrics 
            }) + "\n");
            console.log(`[OK] ${phase}:${i} (${res.metrics.total_ms}ms)`);
        } catch (e) {
            console.error(`[ERR] ${phase}:${i} :: ${e.message}`);
        }
    }
  }
}

run();