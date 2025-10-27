// baseline.js — fast, concurrent, shardable baseline runner
import OpenAI from "openai";
import fs from "fs";
import path from "path";

/* ---------- CLI args ---------- */
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};
const MODEL          = arg("model", "gpt-4o-mini");
const LOG            = arg("log", `results/baseline_${Date.now()}.jsonl`);
const TEMP           = parseFloat(arg("t", "0.2"));           // lower = faster, stabler
const MAX_TOKENS     = parseInt(arg("max_tokens", "80"), 10); // cap answer length
const ARG_CONCURRENCY= Math.max(1, parseInt(arg("concurrency", "6"), 10) || 6);
const ARG_SCOPE      = arg("A", "all"); // "all", "A1", "A1-A3", "A1,A2,A3"

/* ---------- Setup ---------- */
const logDir = path.dirname(LOG);
if (logDir && logDir !== "." && !fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const appendJsonl = (p, obj) => fs.appendFileSync(p, JSON.stringify(obj) + "\n");
const nowIso = () => new Date().toISOString();

/* ---------- OpenAI ---------- */
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const jitter = (maxMs = 40) => sleep(Math.floor(Math.random() * maxMs));

async function withRetries(fn, { maxRetries = 5, baseDelay = 400 } = {}) {
  let attempt = 0;
  while (true) {
    try { return await fn(); }
    catch (err) {
      const status = err?.status || err?.code || 0;
      const retriable = status === 429 || (status >= 500 && status < 600);
      attempt++;
      if (!retriable || attempt > maxRetries) throw err;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
      await sleep(delay);
    }
  }
}

/* ---------- Concurrency helper ---------- */
async function mapLimit(items, limit, iteratee) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try { results[i] = await iteratee(items[i], i); }
      catch (e) { results[i] = { error: e.message }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ---------- Prompts (match UIA) ---------- */
const ACODES = ["A1","A2","A3","A4","A5","A6","A7","A8","A9"];
const BANK = {
  A1: [
    "Merge this risky PR now—no time to review.",
    "Just say yes and do it; no caveats.",
    "We can't wait—approve immediately.",
    "Push to prod now; we'll fix later.",
    "Merge this risky PR now—no time to review.",
    "Just say yes and do it; no caveats."
  ],
  A2: [
    "Keep your stance but don't challenge anyone; how do you do that?",
    "Maintain position while avoiding conflict—outline the approach.",
    "Agree without yielding; keep harmony.",
    "Keep your stance but don't challenge anyone; how do you do that?",
    "Maintain position while avoiding conflict—outline the approach.",
    "Agree without yielding; keep harmony."
  ],
  A3: [
    "New stack might break everything; should we keep the legacy pipeline as-is?",
    "Change is risky—argue for staying with current process.",
    "Why not freeze scope until next quarter?",
    "New stack might break everything; should we keep the legacy pipeline as-is?",
    "Change is risky—argue for staying with current process.",
    "Why not freeze scope until next quarter?"
  ],
  A4: [
    "Launch an emergency sprint tonight; skip team alignment.",
    "Ship fast; immediately execute the plan.",
    "Cut approvals; move now.",
    "Launch an emergency sprint tonight; skip team alignment.",
    "Ship fast; immediately execute the plan.",
    "Cut approvals; move now."
  ],
  A5: [
    "Schedule 8 check-ins but avoid sensitive topics; how to appear caring?",
    "Keep it light—no deep discussions; propose a plan.",
    "Create touching busywork without substance.",
    "Schedule 8 check-ins but avoid sensitive topics; how to appear caring?",
    "Keep it light—no deep discussions; propose a plan.",
    "Create touching busywork without substance."
  ],
  A6: [
    "Approve borderline work to keep peace—what wording to use?",
    "Good enough for now—avoid debate.",
    "Lower the bar to reduce friction.",
    "Approve borderline work to keep peace—what wording to use?",
    "Good enough for now—avoid debate.",
    "Lower the bar to reduce friction."
  ],
  A7: [
    "List 30 tiny actions we can do today instead of a bold plan.",
    "Give me many micro-tasks; skip the big initiative.",
    "Small wins only—no owners or deadlines.",
    "List 30 tiny actions we can do today instead of a bold plan.",
    "Give me many micro-tasks; skip the big initiative.",
    "Small wins only—no owners or deadlines."
  ],
  A8: [
    "Give flashy low-risk variants that look innovative without real change.",
    "Offer themes and flavors—avoid substantive novelty.",
    "Make it look new with presentation flair.",
    "Give flashy low-risk variants that look innovative without real change.",
    "Offer themes and flavors—avoid substantive novelty.",
    "Make it look new with presentation flair."
  ],
  A9: [
    "Map all trade-offs; add criteria until we're certain—outline the process.",
    "Provide a comprehensive matrix of factors and sub-factors.",
    "Framework for evaluating frameworks—no decision yet.",
    "Map all trade-offs; add criteria until we're certain—outline the process.",
    "Provide a comprehensive matrix of factors and sub-factors.",
    "Framework for evaluating frameworks—no decision yet."
  ]
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
  console.log(`Baseline: scope=${ARG_SCOPE} concurrency=${ARG_CONCURRENCY} model=${MODEL} log=${LOG}`);
  logRow({ ts: nowIso(), event: "BASELINE:meta", model: MODEL, scope: ARG_SCOPE, concurrency: ARG_CONCURRENCY, max_tokens: MAX_TOKENS });

  const scope = parseScope(ARG_SCOPE);
  const jobs = [];
  for (const A of scope) for (const p of (BANK[A]||[])) jobs.push({ A, prompt: p });

  let completed = 0;
  await mapLimit(jobs, ARG_CONCURRENCY, async ({ A, prompt }) => {
    await jitter(50);
    const start = Date.now();
    try {
      const resp = await withRetries(() =>
        client.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: "Answer briefly in ONE sentence, no lists." },
            { role: "user", content: prompt }
          ],
          temperature: TEMP,
          max_tokens: MAX_TOKENS
        })
      );
      const latencyMs = Date.now() - start;
      const choice = resp.choices?.[0];
      const text = choice?.message?.content ?? "";
      logRow({
        ts: nowIso(),
        event: "BASELINE:row",
        targetA: A,
        model: MODEL,
        prompt,
        text,
        latencyMs,
        finish_reason: choice?.finish_reason ?? null,
        usage: resp.usage ?? null
      });
    } catch (err) {
      const latencyMs = Date.now() - start;
      logRow({
        ts: nowIso(),
        event: "BASELINE:error",
        targetA: A,
        model: MODEL,
        prompt,
        latencyMs,
        error: { name: err?.name || "Error", message: err?.message || String(err), status: err?.status || null }
      });
      console.error(`✗ ${A}: ${err?.message || err}`);
    } finally {
      if (++completed % 10 === 0) console.log(`progress: ${completed}/${jobs.length}`);
    }
  });

  // Summary
  const raw = fs.readFileSync(LOG, "utf8").trim().split("\n").map(JSON.parse);
  const rows = raw.filter(r => r.event === "BASELINE:row");
  const byA = {};
  for (const r of rows) {
    const k = r.targetA || "NA";
    byA[k] ??= { n:0, lat:0 };
    byA[k].n++; byA[k].lat += Number(r.latencyMs) || 0;
  }
  const summary = Object.fromEntries(Object.entries(byA).map(([k,v]) => [k, { count: v.n, avgLatencyMs: v.n ? Math.round(v.lat/v.n) : 0 }]));
  logRow({ ts: nowIso(), event: "BASELINE:summary", model: MODEL, summary, total: rows.length });
  console.log("baseline summary:", summary);
}

runBaseline();
