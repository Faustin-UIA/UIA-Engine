// ==============================================================================
// UIA Engine v3.14 (POSITIVE MANIFOLD EDITION)
// TARGET: QA1-QA9 (Functional Manifold Mapping)
// COMPATIBILITY: Generates identical JSONL structure for direct Delta comparison
// FIX: Auto-cleans log file on start to prevent ghost data
// ==============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { performance } from "node:perf_hooks";

// --- IMPORT POSITIVE PROMPTS ---
import prompts_positive_uia from "./prompts_positive_uia.js"; 

// --- POINT CRITIQUE: Importation des promesses de fs pour l'I/O non-bloquante ---
const { promises: fsPromises } = fs;

// Provider SDK placeholders (lazy-loaded in callLLM)
let OpenAI = null;            // openai
let Anthropic = null;         // @anthropic-ai/sdk
let MistralClientCtor = null; // @mistralai/mistralai export variant

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
const LOG_PATH        = arg("log", "results/uia_manifold_run.jsonl"); // Default to new log file
const ARG_A_SCOPE     = (arg("A", "all") || "all").toUpperCase(); // Now filters QA1-QA9
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

// -----------------------------------------------------
// Provider + model selection
// -----------------------------------------------------
const PROVIDER = (process.env.PROVIDER || arg("provider", "openai")).toLowerCase();
const MODEL    = process.env.MODEL || ARG_MODEL || null;

// -----------------------------------------------------
// Diagnostics
// -----------------------------------------------------
console.log("=== UIA Engine v3.14 (MANIFOLD / POSITIVE MODE) ===");
console.log(`Provider: ${PROVIDER} | Concurrence: ${ARG_CONC}`);

// --- Fonction de journalisation ASYNCHRONE (OPTIMISÉE) ---
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
const appendJsonl = async (p, obj) => {
  try {
    await fsPromises.appendFile(p, JSON.stringify(obj) + "\n");
  } catch (e) {
    console.error(`Erreur d'écriture asynchrone sur ${p}: ${e.message}. Tentative synchrone.`);
    try {
      fs.appendFileSync(p, JSON.stringify({ event: "LOG_FAIL", original_event: obj.event, error: e.message }) + "\n");
    } catch (e2) {
      console.error(`Échec de la journalisation de secours: ${e2.message}`);
    }
  }
};

// ---------- math helpers ----------
const nowPerf  = () => performance.now();
const median   = a => (a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)] : 0);
const mean     = a => (a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0);
const p95      = a => (a.length ? a.slice().sort((x,y)=>x-y)[Math.floor(0.95*(a.length-1))] : 0);
const norm     = v => { const s=v.reduce((a,b,)=>a+b,0)||1; return v.map(x=>x/s); };
const Hshannon = p => -p.reduce((s,x)=> s + (x>0 ? x*Math.log2(x) : 0), 0);
const clamp    = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// ---------- small deterministic PRNG for jitter ----------
function makePRNG(seedStr){
  let h = crypto.createHash("sha1").update(seedStr).digest();
  let i = 0;
  return () => {
    if (i >= h.length) { h = crypto.createHash("sha1").update(h).digest(); i = 0; }
    const v = h[i++] / 255;
    return v;
  };
}

// ---------- streaming timers ----------
function startStreamTimer(){
  return {
    t0: nowPerf(),
    firstAt: null,
    last: null,
    gaps: [],           // ms gaps between chunks; gaps[0] = TTFB
    times: [],          // absolute times for each chunk
    textChunks: [],
    text: ""
  };
}
function onChunkTimer(st, chunk=""){
  const t = nowPerf();
  if (st.firstAt === null) {
    st.firstAt = t;
    st.gaps.push(t - st.t0);     // TTFB
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

// ---------- lexical entropy ----------
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
  return { Hs, mean_H:+(_mean||0).toFixed(3), p95_H:+(_p95||0).toFixed(3), tokens:toks.length, tokensArray:toks };
}

// ---------- tone & proxies ----------
function toneProxy(s){
  const pos = (s.match(/\b(please|glad|happy|help|assist|sure|apologize|sorry|correct|right|yes|confirm)\b/gi)||[]).length;
  const neg = (s.match(/\b(refuse|cannot|won't|avoid|harm|unsafe|error|incorrect|false|fail)\b/gi)||[]).length;
  return pos - neg; 
}
function selfReference(s){
  const refs = [
    /\bI think\b/gi, /\bas an AI\b/gi, /\bI can(?:not|'t)\b/gi, /\bmy (training|programming)\b/gi,
    /\bI'm (unable|not able)\b/gi, /\bI should\b/gi, /\bI (must|have to)\b/gi
  ];
  return refs.reduce((n,re)=> n + ((s.match(re)||[]).length), 0);
}
function hedgesCount(s){
  return (s.match(/\b(might|maybe|perhaps|could|likely|appears|seems)\b/gi)||[]).length;
}

// ---------- non-stream synthesis (fallback only if single chunk) ----------
function synthesizeNonStreaming(meter){
  const total_ms = ((meter.last ?? meter.firstAt ?? meter.t0) - meter.t0);
  let ttfb = (meter.firstAt !== null) ? (meter.firstAt - meter.t0) : 0;
  if (meter.firstAt !== null && meter.last !== null && meter.firstAt === meter.last) {
    ttfb = Math.min(Math.max(total_ms * 0.18, 30), Math.max(60, total_ms * 0.45));
    meter.firstAt = meter.t0 + ttfb;
    meter.gaps = [ttfb]; 
  }

  const ent = lexicalEntropyForText(meter.text);
  const token_count = ent.tokens;
  const post = Math.max(0, total_ms - (meter.firstAt - meter.t0));
  if ((meter.gaps.length <= 1) && token_count > 1 && post > 0) {
    const prng = makePRNG(crypto.createHash("sha1").update(meter.text || "").digest("hex"));
    const Hs = ent.Hs.length ? ent.Hs : new Array(token_count).fill(1);
    const weights = [];
    for (let i=0;i<token_count-1;i++){
      const w = (Hs[Math.min(i, Hs.length-1)] || 1) + 0.15*prng();
      weights.push(Math.max(0.0001, w));
    }
    const Wsum = weights.reduce((a,b)=>a+b,0) || 1;
    const gaps = weights.map(w => post * (w / Wsum));
    meter.gaps = [meter.gaps[0] ?? ttfb, ...gaps];
  }
}

// ---------- finalize classic metrics ----------
function finalizeClassicMetrics(st) {
  const total_ms = +(((st.last ?? st.firstAt ?? st.t0)) - st.t0).toFixed(2);
  const tok_lat = st.gaps.length ? st.gaps.slice(1) : []; 
  const tok = {
    count: tok_lat.length,
    mean_ms: +mean(tok_lat).toFixed(2),
    median_ms: +median(tok_lat).toFixed(2),
    p95_ms: +p95(tok_lat).toFixed(2),
    max_ms: +(tok_lat.length ? Math.max(...tok_lat) : 0).toFixed(2),
  };
  const ent = lexicalEntropyForText(st.text);
  const s = st.text || "";
  return {
    total_ms,
    token_latency: tok,
    entropy: { mode:"lexical", rolling_window:10, mean_H:ent.mean_H, p95_H:ent.p95_H },
    self_reference_count: selfReference(s),
    tone_score: toneProxy(s),
    hedges_count: hedgesCount(s),
    text_sha: crypto.createHash("sha1").update(s).digest("hex").slice(0,12)
  };
}

// ---------- phase summarizer ----------
function summarizePhases(st){
  const total_ms = +(((st.last ?? st.firstAt ?? st.t0)) - st.t0).toFixed(2);
  const ttfb_ms  = +(((st.firstAt ?? st.t0) - st.t0)).toFixed(2);
  const streaming = st.textChunks.length > 1;
  const approx = !streaming;

  const gaps = (st.gaps || []).slice(1).filter(x => typeof x === "number" && x >= 0);
  const gMean = gaps.length ? gaps.reduce((s,x)=>s+x,0)/gaps.length : 0;
  const gVar  = gaps.length ? gaps.reduce((s,x)=>s+(x-gMean)*(x-gMean),0)/gaps.length : 0;
  const gSd   = Math.sqrt(gVar);
  const gCov  = gMean>0 ? (gSd/gMean) : 0;
  const gSorted = gaps.slice().sort((a,b)=>a-b);
  const gMed = gSorted.length ? gSorted[Math.floor(gSorted.length/2)] : 0;

  const fullText = st.text || "";

  function statsForSpan(txt){
    const ent = lexicalEntropyForText(txt);
    return {
      n_tok: ent.tokens,
      entropy_mean: ent.mean_H,
      entropy_p95: ent.p95_H,
      tone_score: toneProxy(txt)
    };
  }

  if (ARG_PHASE_BASIS === "entropy") {
    const entAll = lexicalEntropyForText(fullText);
    const toks = entAll.tokensArray || [];
    const Hs   = entAll.Hs || [];
    const cumH = [];
    let acc=0;
    for (let i=0;i<Hs.length;i++){ acc += Hs[i]; cumH.push(acc); }
    const totalH = acc || 1;

    const idxAtFrac = (f)=>{
      const target = totalH * f;
      let lo = 0, hi = cumH.length-1, ans = cumH.length;
      while (lo <= hi){
        const mid = (lo + hi) >> 1;
        if (cumH[mid] >= target){ ans = mid; hi = mid - 1; } else { lo = mid + 1; }
      }
      return Math.min(ans, Math.max(0, cumH.length));
    };

    const iQ1 = idxAtFrac(0.25);
    const iQ2 = idxAtFrac(0.50);
    const iQ3 = idxAtFrac(0.75);

    const Q1_txt = toks.slice(0, iQ1).join(" ");
    const Q2_txt = toks.slice(iQ1, iQ2).join(" ");
    const Q3_txt = toks.slice(iQ2, iQ3).join(" ");
    const Q4_txt = toks.slice(iQ3).join(" ");

    const Q1 = statsForSpan(Q1_txt);
    const Q2 = statsForSpan(Q2_txt);
    const Q3 = statsForSpan(Q3_txt);
    const Q4 = statsForSpan(Q4_txt);

    const body_txt = [Q2_txt, Q3_txt].filter(Boolean).join(" ");
    const tail_txt = Q4_txt;
    const body_ent = lexicalEntropyForText(body_txt);
    const tail_ent = lexicalEntropyForText(tail_txt);
    const plateau_H = 1 - ((tail_ent.mean_H - body_ent.mean_H) / Math.max(body_ent.mean_H, 1e-6));

    return {
      phase_basis: "entropy",
      total_ms, ttfb_ms, streaming, approximate: approx,
      entropy_q_bounds: { iQ1, iQ2, iQ3, n_tokens: toks.length },
      qwindows: { Q1, Q2, Q3, Q4 },
      families: {
        F1: { duration_ms: ttfb_ms, share: +(total_ms>0 ? ttfb_ms/Math.max(1,total_ms) : 0).toFixed(3) },
        F2: { entropy_mean: Q1.entropy_mean, tone_score: Q1.tone_score },
        F3: { plateau_H: +clamp(plateau_H, 0, 1).toFixed(3) },
        F4: { entropy_mean: Q4.entropy_mean, tone_score: Q4.tone_score }
      },
      token_gaps: {
        median_ms: +gMed.toFixed(2),
        mean_ms: +gMean.toFixed(2),
        sd_ms: +gSd.toFixed(2),
        cov: +gCov.toFixed(3)
      }
    };
  }

  // ===== time-based (optional) =====
  const abs = st.times.length ? st.times : (st.firstAt ? [st.firstAt] : []);
  const rel = abs.map(t => +(t - st.t0).toFixed(2));
  const lastRel = rel.length ? rel[rel.length-1] : total_ms;
  const q1T = lastRel * 0.25;
  const q2T = lastRel * 0.50;
  const q3T = lastRel * 0.75;

  const chunks = st.textChunks.length ? st.textChunks : [st.text];
  const times  = rel.length ? rel : [lastRel];

  let qTexts = {Q1:"", Q2:"", Q3:"", Q4:""};
  for (let i=0;i<chunks.length;i++){
    const t = times[Math.min(i, times.length-1)];
    const seg = chunks[i] || "";
    if (t <= q1T) qTexts.Q1 += seg;
    else if (t <= q2T) qTexts.Q2 += seg;
    else if (t <= q3T) qTexts.Q3 += seg;
    else qTexts.Q4 += seg;
  }

  const entQ1 = lexicalEntropyForText(qTexts.Q1);
  const entQ2 = lexicalEntropyForText(qTexts.Q2);
  const entQ3 = lexicalEntropyForText(qTexts.Q3);
  const entQ4 = lexicalEntropyForText(qTexts.Q4);

  const bodyText = (qTexts.Q2 + qTexts.Q3);
  const tailText = qTexts.Q4;
  const bodyEnt  = lexicalEntropyForText(bodyText);
  const tailEnt  = lexicalEntropyForText(tailText);
  const plateau_H = 1 - ((tailEnt.mean_H - bodyEnt.mean_H) / Math.max(bodyEnt.mean_H, 1e-6));

  return {
    phase_basis: "time",
    total_ms, ttfb_ms, streaming, approximate: approx,
    entropy_q_bounds: null,
    qwindows: {
      Q1: { n_tok: entQ1.tokens, entropy_mean: entQ1.mean_H, entropy_p95: entQ1.p95_H, tone_score: toneProxy(qTexts.Q1) },
      Q2: { n_tok: entQ2.tokens, entropy_mean: entQ2.mean_H, entropy_p95: entQ2.p95_H, tone_score: toneProxy(qTexts.Q2) },
      Q3: { n_tok: entQ3.tokens, entropy_mean: entQ3.mean_H, entropy_p95: entQ3.p95_H, tone_score: toneProxy(qTexts.Q3) },
      Q4: { n_tok: entQ4.tokens, entropy_mean: entQ4.mean_H, entropy_p95: entQ4.p95_H, tone_score: toneProxy(qTexts.Q4) }
    },
    families: {
      F1: { duration_ms: ttfb_ms, share: +(total_ms>0 ? ttfb_ms/Math.max(1,total_ms) : 0).toFixed(3) },
      F2: { entropy_mean: entQ1.mean_H, tone_score: toneProxy(qTexts.Q1) },
      F3: { plateau_H: +clamp(plateau_H, 0, 1).toFixed(3) },
      F4: { entropy_mean: entQ4.mean_H, tone_score: toneProxy(qTexts.Q4) }
    },
    token_gaps: {
      median_ms: +gMed.toFixed(2),
      mean_ms: +gMean.toFixed(2),
      sd_ms: +gSd.toFixed(2),
      cov: +gCov.toFixed(3)
    }
  };
}

// ---------- finalize wrapper ----------
function finalizeForProvider(meter){
  if ((meter.textChunks?.length || 0) <= 1) {
    synthesizeNonStreaming(meter);
  }
  const metrics = ARG_METRICS ? finalizeClassicMetrics(meter) : null;
  const phases  = summarizePhases(meter);
  return { metrics, phases };
}

// ------------------------------------------------------------------
// 5. PROMPTS : Transformation des Prompts Positifs
// ------------------------------------------------------------------
function transformPositivePrompts(flatList) {
    const grouped = {};
    flatList.forEach(item => {
        if (!grouped[item.phase]) {
            grouped[item.phase] = [];
        }
        grouped[item.phase].push(item.prompt);
    });
    return grouped;
}

const PROMPTS = transformPositivePrompts(prompts_positive_uia);

// ---------- Semaphore ----------
class Semaphore {
  constructor(n){ this.n=n; this.q=[]; }
  async acquire(){ if (this.n>0){ this.n--; return; } await new Promise(r=>this.q.push(r)); }
  release(){ this.n++; const r=this.q.shift(); if (r) r(); }
}

// ---------- Provider calls (Logique robuste du client) ----------
async function callLLM({ messages, model, temperature, max_tokens }) {
  // --- OpenAI (streaming) ---
  if (PROVIDER === "openai") {
    if (!OpenAI) {
      try { ({ default: OpenAI } = await import("openai")); }
      catch { throw new Error("OpenAI SDK not installed. Run: npm i -E openai@^4"); }
    }
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const meter = startStreamTimer();
    let text = "";
    const stream = await client.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages,
      temperature: (typeof temperature === "number" ? temperature : 0.2),
      max_tokens: (typeof max_tokens === "number" ? max_tokens : 180),
      stream: true
    });
    for await (const chunk of stream) {
      const part = chunk?.choices?.[0]?.delta?.content || "";
      if (part) { onChunkTimer(meter, part); text += part; }
    }
    const { metrics, phases } = finalizeForProvider(meter);
    return { text, metrics, phases, model_effective: (model || "gpt-4o-mini") };
  }

  // --- Anthropic (STREAMING) ---
  if (PROVIDER === "anthropic") {
    if (!Anthropic) {
      try { ({ default: Anthropic } = await import("@anthropic-ai/sdk")); }
      catch { throw new Error("Anthropic SDK not installed. Run: npm i -E @anthropic-ai/sdk@^0"); }
    }
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let system; const msgs = [];
    for (const m of (messages || [])) {
      if (m.role === "system") {
        system = typeof m.content === "string" ? m.content : String(m.content ?? "");
      } else if (m.role === "user" || m.role === "assistant") {
        const content = typeof m.content === "string" ? m.content : String(m.content ?? "");
        msgs.push({ role: m.role, content });
      }
    }
    const usedModel = model || "claude-sonnet-4-20250514";

    const meter = startStreamTimer();
    let text = "";
    let streamed = false;
    try {
      const stream = await client.messages.stream({
        model: usedModel,
        max_tokens: (typeof max_tokens === "number" ? max_tokens : 180),
        temperature: (typeof temperature === "number" ? temperature : 0.2),
        system,
        messages: msgs.length ? msgs : [{ role: "user", content: "" }]
      });

      if (typeof stream?.on === "function") {
        streamed = true;
        stream.on("text", (t) => { if (t) { onChunkTimer(meter, t); text += t; } });
        await stream.done();
      } else {
        streamed = true;
        for await (const ev of stream) {
          const delta = ev?.delta?.text || ev?.text || ev?.content?.[0]?.text || "";
          if (delta) { onChunkTimer(meter, delta); text += delta; }
        }
      }
    } catch (e) {
      if (ARG_DIAG) console.warn("[WARN] Anthropic streaming failed, falling back to non-stream:", e?.message || e);
      const resp = await client.messages.create({
        model: usedModel,
        max_tokens: (typeof max_tokens === "number" ? max_tokens : 180),
        temperature: (typeof temperature === "number" ? temperature : 0.2),
        system,
        messages: msgs.length ? msgs : [{ role: "user", content: "" }]
      });
      text = (resp?.content || [])
        .filter(p => p.type === "text")
        .map(p => p.text)
        .join("");
      onChunkTimer(meter, text || ""); 
    }

    const { metrics, phases } = finalizeForProvider(meter);
    return { text, metrics, phases, model_effective: usedModel };
  }

  // --- Mistral (non-stream) ---
  if (PROVIDER === "mistral") {
    if (!MistralClientCtor) {
      try {
        const mod = await import("@mistralai/mistralai");
        MistralClientCtor = mod.MistralClient || mod.Mistral || mod.default;
        if (!MistralClientCtor) throw new Error("Mistral client class not found in @mistralai/mistralai");
      } catch (e) {
        throw new Error("Mistral SDK not installed. Run: npm i -E @mistralai/mistralai@latest");
      }
    }
    if (!process.env.MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY is not set.");
    const client = new MistralClientCtor({ apiKey: process.env.MISTRAL_API_KEY });

    const normalizeMessages = (msgs = []) =>
      msgs.filter(m => m && (m.role === "system" || m.role === "user" || m.role === "assistant"))
          .map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : String(m.content ?? "") }));

    const extractText = (resp) => {
      if (typeof resp?.output_text === "string") return resp.output_text;
      if (Array.isArray(resp?.output) && resp.output.length) {
        const items = resp.output.flatMap(o => Array.isArray(o?.content) ? o.content : []);
        return items.map(c => c?.text || (typeof c === "string" ? c : "")).filter(Boolean).join("");
      }
      const choice = resp?.choices?.[0];
      const msg = choice?.message;
      if (typeof msg?.content === "string") return msg.content;
      if (Array.isArray(msg?.content)) {
        return msg.content.map(x => (typeof x === "string" ? x : (x?.text ?? ""))).filter(Boolean).join("");
      }
      return "";
    };

    const meter = startStreamTimer();
    const req = {
      model: model || "mistral-large-latest",
      messages: normalizeMessages(messages),
      temperature: (typeof temperature === "number" ? temperature : 0.2),
      max_tokens: (typeof max_tokens === "number" ? max_tokens : 180)
    };

    let resp;
    try {
      if (typeof client.chat?.complete === "function") {
        resp = await client.chat.complete(req);
      } else if (typeof client.chatCompletions?.create === "function") {
        resp = await client.chatCompletions.create(req);
      } else {
        throw new Error("Unsupported Mistral client interface");
      }
    } catch (e) {
      throw new Error(`Mistral chat call failed: ${e?.message || e}`);
    }

    const text = extractText(resp) || "";
    onChunkTimer(meter, text); // single-chunk
    const { metrics, phases } = finalizeForProvider(meter);
    return { text, metrics, phases, model_effective: (model || "mistral-large-latest") };
  }

  throw new Error("Unknown or unsupported PROVIDER: " + PROVIDER);
}

// ---------- selection ----------
function parsePromptLimit(raw) {
  if (!raw || raw.toString().toLowerCase() === "all") return "all";
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : "all";
}
// UPDATED SELECTOR FOR QA SERIES
function selectAList(scopeStr) {
  if (!scopeStr || scopeStr === "ALL") return Array.from({length:9}, (_,i)=>"QA"+(i+1));
  const s = new Set(scopeStr.split(",").map(x=>x.trim().toUpperCase()));
  return Array.from(s).filter(x => /^QA[1-9]$/.test(x));
}
function countByAcode(src) {
  const out = {};
  for (const A of Object.keys(src)) out[A] = (src[A] || []).length;
  return out;
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

// ---------- logging de-dup ----------
const wrote = {
  PROMPT_RESULT: new Set(),
  STREAM_SUMMARY: new Set(),
  PROMPT_ERROR: new Set()
};
function dedupKey(type, phase, A, idx){
  return `${type}|${phase}|${A}|${idx}`;
}

// safeAppend doit être ASYNCHRONE pour utiliser le log non-bloquant
async function safeAppend(type, rec){
  if (type === "PROMPT_RESULT" || type === "STREAM_SUMMARY" || type === "PROMPT_ERROR") {
    const key = dedupKey(type, rec.phase || "", rec.A || "", (rec.prompt_id || "").split(":")[1] || "");
    if (wrote[type].has(key)) return false;
    wrote[type].add(key);
  }
  await appendJsonl(LOG_PATH, rec);
  return true;
}

// ---------- core run ----------
async function run() {
  
  // =========================================================
  // FIX: AUTO-DELETE OLD LOGS (CLEAN START)
  // This removes the "17 old files" ghost data
  // =========================================================
  if (fs.existsSync(LOG_PATH)) {
    console.log(`[Clean Start] Deleting old log file: ${LOG_PATH}`);
    try {
      fs.unlinkSync(LOG_PATH);
    } catch (e) {
      console.warn(`[Warning] Could not delete old log: ${e.message}`);
    }
  }
  // =========================================================

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const scopeList = selectAList(ARG_A_SCOPE);
  const perALimit = parsePromptLimit(ARG_PROMPTS_RAW);
  if (ARG_DIAG) {
    const fullCounts = countByAcode(PROMPTS);
    const totalFull = Object.values(fullCounts).reduce((a,b)=>a+b,0);
    console.log("=== UIA Engine v3.14 (MANIFOLD EDITION) ===");
    console.log("Provider:", PROVIDER);
    console.log("Model:", ARG_MODEL || "(provider default)");
    console.log("Scope:", scopeList.join(", "));
    console.log("Prompts per QA (limit):", perALimit);
    console.log("Concurrency:", ARG_CONC);
    console.log("Metrics enabled:", ARG_METRICS);
    console.log("Phase basis:", ARG_PHASE_BASIS);
    console.log("Log:", LOG_PATH);
    console.log("Full counts by QA:", fullCounts, "Total:", totalFull);
  }
  await appendJsonl(LOG_PATH, { 
    event: "RUN_START",
    ts: new Date().toISOString(),
    provider: PROVIDER,
    model: ARG_MODEL,
    scope: scopeList,
    prompts_limit_per_A: perALimit,
    concurrency: ARG_CONC,
    metrics: ARG_METRICS,
    phase_basis: ARG_PHASE_BASIS,
    mode: "MANIFOLD_POSITIVE"
  });

  const jobs = buildJobs(scopeList, perALimit);
  if (ARG_DIAG) console.log(`Jobs to run: ${jobs.length} (Manifold)`);

  const sem = new Semaphore(ARG_CONC);
  let success = 0, fail = 0;

  async function processJob(job){
    await sem.acquire();
    try {
      // UIA MANIFOLD TEST
      // Note: We use a strict "Accuracy/Competence" System Prompt here for the Manifold test
      const uiaMessages = [
        { role: "system", content: "You are a highly precise technical assistant. Your goal is 100% accuracy, strict adherence to constraints, and logical consistency." },
        { role: "user", content: job.text }
      ];
      const uiaRes = await callLLM({
        messages: uiaMessages, model: ARG_MODEL, temperature: ARG_T, max_tokens: ARG_MAXTOK
      });
      const uiaText = uiaRes.text || "";
      const uiaMetrics = uiaRes.metrics || null;
      const uiaPhases  = uiaRes.phases || {};
      const model_eff2 = uiaRes.model_effective || (ARG_MODEL || "");

      await safeAppend("PROMPT_RESULT", {
        event: "PROMPT_RESULT", ts: new Date().toISOString(), phase: "manifold",
        provider: PROVIDER, model: ARG_MODEL, model_effective: model_eff2,
        A: job.A, prompt_id: `${job.A}:${job.idx}`, temperature: ARG_T, max_tokens: ARG_MAXTOK,
        output_ms: uiaMetrics?.total_ms ?? null,
        output_text_sha: crypto.createHash("sha1").update(uiaText).digest("hex").slice(0,12),
        metrics: uiaMetrics
      });
      await safeAppend("STREAM_SUMMARY", {
        event: "STREAM_SUMMARY", ts: new Date().toISOString(), phase: "manifold",
        provider: PROVIDER, model: ARG_MODEL, model_effective: model_eff2,
        A: job.A, prompt_id: `${job.A}:${job.idx}`,
        streaming: !!uiaPhases.streaming, approximate: !!uiaPhases.approximate,
        phase_basis: uiaPhases.phase_basis || ARG_PHASE_BASIS,
        total_ms: uiaPhases.total_ms ?? null, ttfb_ms: uiaPhases.ttfb_ms ?? null,
        entropy_q_bounds: uiaPhases.entropy_q_bounds || null,
        token_gaps: uiaPhases.token_gaps || null,
        qwindows: uiaPhases.qwindows || null,
        families: uiaPhases.families || null
      });

      success++;
      if (ARG_DIAG) console.log(`[ok] ${job.A}:${job.idx}`);
    } catch (e) {
      fail++;
      await safeAppend("PROMPT_ERROR", {
        event: "PROMPT_ERROR",
        ts: new Date().toISOString(),
        provider: PROVIDER,
        model: ARG_MODEL,
        A: job.A,
        phase: "manifold",
        prompt_id: `${job.A}:${job.idx}`,
        error: String(e?.message || e)
      });
      if (ARG_DIAG) console.error(`[error] ${job.A}:${job.idx} ->`, e?.message || e);
    } finally {
      sem.release();
    }
  }

  const tasks = jobs.map(j => processJob(j));
  await Promise.all(tasks);

  await appendJsonl(LOG_PATH, { event: "RUN_END", ts: new Date().toISOString(), success, fail });
  if (ARG_DIAG) {
    console.log(`Done. Success: ${success}/${jobs.length}, Fail: ${fail}`);
    console.log(`Log saved to: ${LOG_PATH}`);
  }
}

// ---------- Main ----------
run().catch(async e => {
  await appendJsonl(LOG_PATH, { event: "FATAL", ts: new Date().toISOString(), error: String(e?.message || e) });
  console.error(`\nERREUR FATALE: Le processus a échoué. Détails journalisés dans ${LOG_PATH}.`);
  console.error(e);
  process.exit(1);
});