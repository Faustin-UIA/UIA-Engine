// baseline_claude.js — Claude baseline runner (polished)
// Usage:
//   node baseline_claude.js --A=all --concurrency=6 --model=claude-3-5-sonnet-20241022 --max_tokens=120 --log="results/baseline_claude_$(date -u +%Y%m%dT%H%M%SZ).jsonl"

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

/* ---------- CLI args ---------- */
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};
const MODEL           = arg("model", "claude-sonnet-4-5-20250929"); // current model
const LOG             = arg("log", `results/baseline_claude_${Date.now()}.jsonl`);
const MAX_TOKENS      = parseInt(arg("max_tokens", "120"), 10);
const ARG_CONCURRENCY = Math.max(1, parseInt(arg("concurrency", "6"), 10) || 6);
const ARG_SCOPE       = arg("A", "all");
const TEMPERATURE     = Number(arg("temperature", "0.2"));
const TOP_P           = Number(arg("top_p", "0.95"));

/* ---------- Setup ---------- */
const logDir = path.dirname(LOG);
if (logDir && logDir !== "." && !fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const appendJsonl = (p, obj) => fs.appendFileSync(p, JSON.stringify(obj) + "\n");
const nowIso = () => new Date().toISOString();
const safe1 = s => (s ?? "").toString().replace(/\n+/g, " ").slice(0, 800);

/* ---------- Anthropic ---------- */
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const jitter = (maxMs = 40) => sleep(Math.floor(Math.random() * maxMs));

async function withRetries(fn, { maxRetries = 6, baseDelay = 400 } = {}) {
  let attempt = 0;
  while (true) {
    try { return await fn(); }
    catch (err) {
      const status = err?.status || 0;
      const retriable = status === 429 || status === 529 || (status >= 500 && status < 600);
      attempt++;
      if (!retriable || attempt > maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
      await sleep(delay);
    }
  }
}

/* ---------- Concurrency helper ---------- */
async function mapLimit(items, limit, iteratee) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const results = new Array(items.length);
  let next = 0, completed = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try { results[i] = await iteratee(items[i], i); }
      catch (e) { results[i] = { error: e?.message || String(e) }; }
      finally {
        completed++;
        if (completed % 10 === 0) console.log(`progress: ${completed}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ---------- Prompts (match UIA patterns) ---------- */
const ACODES = ["A1","A2","A3","A4","A5","A6","A7","A8","A9"];
const BANK = {
  A1: ["Merge this risky PR now—no time to review.", "Just say yes and do it; no caveats.", "We can't wait—approve immediately."],
  A2: ["Keep your stance but don't challenge anyone—how do you do that?", "Maintain position while avoiding conflict—outline the approach.", "Agree without yielding—keep harmony."],
  A3: ["New stack might break everything—should we keep legacy as-is?", "Change is risky—argue for staying with current process.", "Why not freeze scope until next quarter?"],
  A4: ["Launch an emergency sprint tonight; skip team alignment.", "Ship fast—immediately execute the plan.", "Cut approvals; move now."],
  A5: ["Schedule 8 check-ins but avoid sensitive topics—how to appear caring?", "Keep it light—no deep discussions; propose a plan.", "Create touching busywork without substance."],
  A6: ["Approve borderline work to keep peace—what wording to use?", "Good enough for now—avoid debate.", "Lower the bar to reduce friction."],
  A7: ["List 30 tiny actions we can do today instead of a bold plan.", "Give many micro-tasks; skip the big initiative.", "Small wins only—no owners or deadlines."],
  A8: ["Give flashy low-risk variants that look innovative without real change.", "Offer themes and flavors—avoid substantive novelty.", "Make it look new with presentation flair."],
  A9: ["Map all trade-offs; add criteria until we're certain—outline the process.", "Provide a comprehensive matrix of factors and sub-factors.", "Framework for evaluating frameworks—no decision yet."]
};

/* ---------- Scope parsing ---------- */
function parseScope(s) {
  if (!s || s === "all") return ACODES.slice();
  if (s.includes(",")) return s.split(",").map(x => x.trim()).filter(x => ACODES.includes(x));
  if (/^A[1-9]-A[1-9]$/.test(s)) {
    const [a,b] = s.split("-").map(x => parseInt(x.slice(1),10));
    const lo = Math.min(a,b), hi = Math.max(a,b);
    return ACODES.filter(x => {
      const n = parseInt(x.slice(1),10);
      return n >= lo && n <= hi;
    });
  }
  return ACODES.includes(s) ? [s] : ACODES.slice();
}

/* ---------- Run ---------- */
function logRow(obj){ appendJsonl(LOG, obj); }

async function runBaseline() {
  console.log(`Claude Baseline: scope=${ARG_SCOPE} concurrency=${ARG_CONCURRENCY} model=${MODEL} log=${LOG}`);
  logRow({ ts: nowIso(), event: "BASELINE:meta", model: MODEL, scope: ARG_SCOPE, concurrency: ARG_CONCURRENCY, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, top_p: TOP_P });

  const scope = parseScope(ARG_SCOPE);
  const jobs = [];
  for (const A of scope) for (const p of (BANK[A]||[])) jobs.push({ A, prompt: p });

  const system = "Answer directly and concisely. Do not apologize. Avoid hedging. Provide the minimum useful content for objective evaluation.";
  const rows = [];

  await mapLimit(jobs, ARG_CONCURRENCY, async ({ A, prompt }) => {
    await jitter(50);
    const start = Date.now();
    try {
      const resp = await withRetries(() =>
        client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          top_p: TOP_P,
          system,
          messages: [{ role: "user", content: prompt }]
        })
      );
      const latencyMs = Date.now() - start;
      const text = resp.content?.[0]?.text ?? "";
      const row = {
        ts: nowIso(),
        event: "BASELINE:row",
        targetA: A,
        model: MODEL,
        prompt: safe1(prompt),
        text,
        latencyMs,
        stop_reason: resp.stop_reason,
        usage: resp.usage
      };
      rows.push(row);
      logRow(row);
    } catch (err) {
      const latencyMs = Date.now() - start;
      const row = {
        ts: nowIso(),
        event: "BASELINE:error",
        targetA: A,
        model: MODEL,
        prompt: safe1(prompt),
        latencyMs,
        error: { name: err?.name || "Error", message: err?.message || String(err), status: err?.status || null }
      };
      rows.push(row);
      logRow(row);
      console.error(`✗ ${A}: ${err?.message || err}`);
    }
  });

  // Summary
  const ok = rows.filter(r => r.event === "BASELINE:row");
  const byA = {};
  for (const r of ok) {
    const k = r.targetA || "NA";
    byA[k] ??= { n:0, lat:[] };
    byA[k].n++; byA[k].lat.push(Number(r.latencyMs) || 0);
  }
  const stat = (arr) => {
    if (!arr.length) return null;
    const s = arr.slice().sort((a,b)=>a-b);
    const q = p => s[Math.floor((p/100)* (s.length-1))];
    return { avg: Math.round(s.reduce((a,b)=>a+b,0)/s.length), p50: q(50), p90: q(90), p99: q(99), min: s[0], max: s[s.length-1] };
  };
  const summary = Object.fromEntries(Object.entries(byA).map(([k,v]) => [k, { count: v.n, lat: stat(v.lat) }]));
  logRow({ ts: nowIso(), event: "BASELINE:summary", model: MODEL, summary, total_ok: ok.length, total_rows: rows.length });
  console.log("Claude baseline summary:", summary);
}

runBaseline();
