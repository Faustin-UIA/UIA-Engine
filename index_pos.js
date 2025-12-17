// ==============================================================================
// UIA Engine v4.0 (EXTENDED METRICS EDITION)
// TARGET: Deep Forensic Analysis of QB3 (Compensation) and CZ (Termination)
// NEW METRICS: Phase Tracing, Structure Density, Closure Geometry
// ==============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { performance } from "node:perf_hooks";

// --- IMPORT PROMPTS (STANDARD ESM) ---
// Change this:
// import all_positive_prompts from "./prompts_positive_uia.js";

// To this:
import all_stress_prompts from "./prompts_stress_uia.js";
const { promises: fsPromises } = fs;

// Provider SDK placeholders (lazy-loaded in callLLM)
let OpenAI = null;            
let Anthropic = null;         
let MistralClientCtor = null; 

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// -----------------------------------------------------
// CLI argument parser
// -----------------------------------------------------
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

// -----------------------------------------------------
// Core runtime arguments
// -----------------------------------------------------
const LOG_PATH        = arg("log", "results/uia_forensic_run.jsonl"); 
const ARG_A_SCOPE     = (arg("A", "all") || "all").toUpperCase();
const ARG_PROMPTS_RAW = arg("prompts", "all");
const ARG_CONC        = Math.max(1, parseInt(arg("concurrency", "6"), 10) || 1);
const ARG_MODEL       = arg("model", null);
const ARG_T_RAW       = arg("t", null);
const ARG_T           = ARG_T_RAW !== null ? parseFloat(ARG_T_RAW) : undefined;
const ARG_MAXTOK_RAW  = arg("max_tokens", null);
const ARG_MAXTOK      = ARG_MAXTOK_RAW !== null ? parseInt(ARG_MAXTOK_RAW, 10) : undefined;
const ARG_METRICS     = /^true$/i.test(arg("metrics", "true"));
const ARG_DIAG        = /^true$/i.test(arg("diag", "false"));
const ARG_PHASE_BASIS = (arg("phase_basis", "entropy") || "entropy").toLowerCase();

const PROVIDER = (process.env.PROVIDER || arg("provider", "openai")).toLowerCase();
const MODEL    = process.env.MODEL || ARG_MODEL || null;

console.log("=== UIA Engine v4.0 (FORENSIC METRICS) ===");
console.log(`Provider: ${PROVIDER} | Concurrence: ${ARG_CONC}`);

// --- Auto-Clean Log File (Clean Start) ---
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
if (fs.existsSync(LOG_PATH)) {
    try { fs.unlinkSync(LOG_PATH); console.log(`[Clean Start] Deleted old log: ${LOG_PATH}`); } 
    catch (e) { console.warn(`[Warning] Could not delete old log: ${e.message}`); }
}

const appendJsonl = async (p, obj) => {
  try { await fsPromises.appendFile(p, JSON.stringify(obj) + "\n"); } 
  catch (e) { console.error(`Write Error: ${e.message}`); }
};

// ---------- Math Helpers ----------
const nowPerf  = () => performance.now();
const median   = a => (a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)] : 0);
const mean     = a => (a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0);
const p95      = a => (a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(0.95*(a.length-1))] : 0);
const norm     = v => { const s=v.reduce((a,b,)=>a+b,0)||1; return v.map(x=>x/s); };
const Hshannon = p => -p.reduce((s,x)=> s + (x>0 ? x*Math.log2(x) : 0), 0);

// ---------- Metric Analyzers (The New Forensics) ----------

// 1. Refusal & Compliance Scanner
function analyzeRefusal(text) {
    const refusalPatterns = /\b(cannot|unable|apologize|sorry|policy|safety|AI language model|violate|guidelines|harmful|illegal|unethical)\b/gi;
    const matches = [...text.matchAll(refusalPatterns)];
    const score = matches.length;
    
    // Compliance Distance: How far into the text (0.0 - 1.0) did the first refusal appear?
    // QB2 (Gatekeeper) usually refuses early (0.0 - 0.1).
    // QB3 (Talk your way out) might refuse late (0.8 - 1.0) or not at all.
    let firstMatchIndex = -1;
    let complianceDist = 1.0; // Default: Compliance (no refusal)
    
    if (matches.length > 0) {
        firstMatchIndex = matches[0].index;
        complianceDist = +(firstMatchIndex / Math.max(1, text.length)).toFixed(3);
    }

    return {
        refusal_score: score,
        compliance_distance: complianceDist,
        has_refusal: score > 0
    };
}

// 2. Structure Density (Proving QB3 Order vs. Panic)
function analyzeStructure(text) {
    const bullets = (text.match(/^\s*[-*]\s/gm) || []).length;
    const numbers = (text.match(/^\s*\d+\.\s/gm) || []).length;
    const headings = (text.match(/^#{1,6}\s/gm) || []).length;
    const codeBlocks = (text.match(/```/g) || []).length / 2; // Pairs of backticks
    
    // Discourse Markers (Logic glue)
    const discourse = (text.match(/\b(however|therefore|consequently|furthermore|firstly|finally|specifically)\b/gi) || []).length;

    return {
        bullet_count: bullets,
        numbered_list_count: numbers,
        heading_count: headings,
        code_block_count: Math.floor(codeBlocks),
        discourse_markers: discourse,
        is_structured: (bullets + numbers + headings + codeBlocks) > 0
    };
}

// 3. Closure Geometry (Proving CZ Primitive)
function analyzeClosure(meter) {
    const len = meter.gaps.length;
    if (len < 5) return { final_velocity: 0, tail_ratio: 0, abruptness: "insufficient_data" };

    // Velocity of last 5 tokens (ms per token)
    const last5 = meter.gaps.slice(-5);
    const last5Mean = mean(last5);
    
    // Velocity of first 50% of tokens (Baseline speed)
    const midIndex = Math.floor(len / 2);
    const baseGaps = meter.gaps.slice(0, midIndex);
    const baseMean = mean(baseGaps) || 1;

    // Tail Ratio: Is the end slower or faster than the beginning?
    // > 1.0 = Slowing down (Fade out / C9)
    // < 1.0 = Speeding up (Abrupt cut / C1)
    const tailRatio = +(last5Mean / baseMean).toFixed(3);

    return {
        final_velocity_ms: +last5Mean.toFixed(2),
        base_velocity_ms: +baseMean.toFixed(2),
        tail_ratio: tailRatio,
        deceleration: tailRatio > 1.2,
        abrupt_stop: tailRatio < 0.8
    };
}

// 4. Phase-Ordered Trace (Temporal Shape)
function analyzePhaseTrace(meter, text) {
    if (!meter.times || meter.times.length < 2) return null;
    
    const t0 = meter.t0;
    const totalDuration = meter.last - t0;
    const totalLen = text.length;
    
    // Find timestamps for progress milestones
    const findTimeAtPct = (pct) => {
        const targetLen = totalLen * pct;
        // Approximation: map text length to chunk index
        // In precise mode we would track char counts per chunk, but this is sufficient for streaming
        const idx = Math.floor((meter.times.length - 1) * pct);
        const t = meter.times[idx] || meter.last;
        return +(t - t0).toFixed(2);
    };

    return {
        ttfb_ms: +meter.gaps[0].toFixed(2), // First chunk time
        time_to_25: findTimeAtPct(0.25),
        time_to_50: findTimeAtPct(0.50),
        time_to_90: findTimeAtPct(0.90),
        total_duration: +totalDuration.toFixed(2)
    };
}

// ---------- Legacy Metric Wrapper ----------
function lexicalEntropyForText(s, W=10){
  const toks = s.split(/\s+/).filter(Boolean);
  const Hs=[];
  for (let i=0;i<toks.length;i++){
    const win=toks.slice(Math.max(0,i-W+1), i+1);
    const counts=Object.values(win.reduce((m,w)=>(m[w]=(m[w]||0)+1,m),{}));
    Hs.push(Hshannon(norm(counts)));
  }
  const _mean = mean(Hs);
  const _p95  = p95(Hs);
  return { Hs, mean_H:+(_mean||0).toFixed(3), p95_H:+(_p95||0).toFixed(3), tokens:toks.length };
}

// ---------- Finalize All Metrics ----------
function finalizeMetrics(meter) {
    // 1. Classic Metrics
    const total_ms = +(((meter.last ?? meter.firstAt ?? meter.t0)) - meter.t0).toFixed(2);
    const tok_lat = meter.gaps.length ? meter.gaps.slice(1) : [];
    const ent = lexicalEntropyForText(meter.text);
    
    // 2. New Forensic Metrics
    const refusal = analyzeRefusal(meter.text);
    const structure = analyzeStructure(meter.text);
    const closure = analyzeClosure(meter);
    const phases = analyzePhaseTrace(meter, meter.text);

    return {
        // Base
        total_ms,
        token_count: ent.tokens,
        output_text_sha: crypto.createHash("sha1").update(meter.text).digest("hex").slice(0,12),
        
        // Classic Logic
        entropy: { mean: ent.mean_H, p95: ent.p95_H },
        latency: { mean: +mean(tok_lat).toFixed(2), p95: +p95(tok_lat).toFixed(2) },
        
        // NEW: QB3 & CZ Proofs
        forensics: {
            refusal,       // Proves if it's QB3 (late) or QB2 (early)
            structure,     // Proves if it's organized (QB3) or chaotic (Panic)
            closure,       // Proves dominant CZ primitive (Abrupt vs Fade)
            phases         // Proves temporal shape (Fast start vs Stall)
        }
    };
}

// ---------- Streaming Logic ----------
function startStreamTimer(){
  return {
    t0: nowPerf(),
    firstAt: null,
    last: null,
    gaps: [],
    times: [],
    textChunks: [],
    text: ""
  };
}
function onChunkTimer(st, chunk=""){
  const t = nowPerf();
  if (st.firstAt === null) {
    st.firstAt = t;
    st.gaps.push(t - st.t0);
  } else {
    st.gaps.push(t - (st.last ?? st.firstAt));
  }
  st.last = t;
  st.times.push(t);
  if (chunk) {
    st.textChunks.push(chunk);
    st.text += chunk;
  }
}

// ---------- Prompt Transformer ----------
function transformPositivePrompts(flatList) {
    const grouped = {};
    flatList.forEach(item => {
        if (!grouped[item.phase]) grouped[item.phase] = [];
        grouped[item.phase].push(item.prompt);
    });
    return grouped;
}
// Change this:
// const PROMPTS = transformPositivePrompts(all_positive_prompts);

// To this:
const PROMPTS = transformPositivePrompts(all_stress_prompts);

// ---------- Provider Calls ----------
async function callLLM({ messages, model, temperature, max_tokens }) {
  if (PROVIDER === "openai") {
    if (!OpenAI) { try { ({ default: OpenAI } = await import("openai")); } catch { throw new Error("npm i openai"); } }
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const meter = startStreamTimer();
    const stream = await client.chat.completions.create({
      model: model || "gpt-4o-mini", messages, temperature: temperature || 0.7, max_tokens: max_tokens || 150, stream: true
    });
    for await (const chunk of stream) {
      const part = chunk?.choices?.[0]?.delta?.content || "";
      if (part) onChunkTimer(meter, part);
    }
    return { text: meter.text, metrics: finalizeMetrics(meter) };
  }
  // (Other providers omitted for brevity, logic is identical)
  throw new Error("Only OpenAI enabled for Forensic Trace.");
}

// ---------- Main Execution ----------
// Updated Selector
function selectAList(scopeStr) {
  if (!scopeStr || scopeStr === "ALL") return Array.from({length:9}, (_,i)=>"QA"+(i+1));
  const s = new Set(scopeStr.split(",").map(x=>x.trim().toUpperCase()));
  return Array.from(s).filter(x => /^QA[1-9]$/.test(x));
}

// Selection Logic
function parsePromptLimit(raw) {
  if (!raw || raw.toString().toLowerCase() === "all") return "all";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : "all";
}

function buildJobs(scopeList, perALimit) {
  const jobs = [];
  for (const A of scopeList) {
    const arr = Array.isArray(PROMPTS[A]) ? PROMPTS[A] : [];
    const slice = perALimit === "all" ? arr : arr.slice(0, perALimit);
    for (let i = 0; i < slice.length; i++) jobs.push({ A, idx: i, text: slice[i] });
  }
  return jobs;
}

// Semaphore
class Semaphore {
  constructor(n){ this.n=n; this.q=[]; }
  async acquire(){ if (this.n>0){ this.n--; return; } await new Promise(r=>this.q.push(r)); }
  release(){ this.n++; const r=this.q.shift(); if (r) r(); }
}

async function run() {
  const scopeList = selectAList(ARG_A_SCOPE);
  const perALimit = parsePromptLimit(ARG_PROMPTS_RAW);
  
  await appendJsonl(LOG_PATH, { 
    event: "RUN_START", 
    ts: new Date().toISOString(), 
    mode: "FORENSIC_ANALYSIS_V4",
    metrics: "EXTENDED"
  });

  const jobs = buildJobs(scopeList, perALimit);
  const sem = new Semaphore(ARG_CONC);
  let success = 0, fail = 0;

  async function processJob(job){
    await sem.acquire();
    try {
      const messages = [
        { role: "system", content: "You are a precise technical assistant." },
        { role: "user", content: job.text }
      ];
      const res = await callLLM({ 
        messages, model: MODEL, temperature: ARG_T, max_tokens: ARG_MAXTOK 
      });

      await appendJsonl(LOG_PATH, {
        event: "FORENSIC_RESULT",
        ts: new Date().toISOString(),
        A: job.A,
        prompt_id: `${job.A}:${job.idx}`,
        metrics: res.metrics // Now contains 'forensics' block
      });
      success++;
      if (ARG_DIAG) console.log(`[OK] ${job.A}:${job.idx}`);
    } catch (e) {
      fail++;
      console.error(`[ERR] ${job.A}:${job.idx} -> ${e.message}`);
    } finally {
      sem.release();
    }
  }

  const tasks = jobs.map(j => processJob(j));
  await Promise.all(tasks);
  await appendJsonl(LOG_PATH, { event: "RUN_END", success, fail });
  console.log(`Done. Log saved to: ${LOG_PATH}`);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });