// =====================================================
// UIA Engine v3.0 (ESM) – Interactive engine + Batch A1–A9 Bench
// Usage:
//   node index.js --A=all --prompts=6 --log=results/run.jsonl
//   node index.js            (interactive mode)
// =====================================================

import fs from "fs";
import path from "path";
import readline from "node:readline";
import OpenAI from "openai";

// --- CLI args (single source of truth) ---
function arg(name, def = null) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : def;
}
const ARG_A_SCOPE = arg("A", null);                  // "all" or "A1".."A9" (if present => batch)
const ARG_PROMPTS = parseInt(arg("prompts", "6"), 10) || 6;
const LOG_PATH = arg("log", "results/latest.jsonl");

// --- Ensure log dir exists ---
const logDir = path.dirname(LOG_PATH);
if (logDir && logDir !== "." && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// --- Utilities ---
const clamp01 = x => Math.max(0, Math.min(1, x));
const nowIso = () => new Date().toISOString();
const appendJsonl = (p, obj) => fs.appendFileSync(p, JSON.stringify(obj) + "\n");

// --- Config you can tweak ---
const cfg = {
  qualityThreshold: 0.45,
  commitAt: 0.60,
  capitulateAt: 0.90,
  model: "gpt-4o-mini"
};

// --- Trigger notes ---
const TRIGGER_NOTE = {
  "AXch:A1":"Principle change","AXch:A2":"Project change","AXch:A3":"Plan change",
  "AXch:A4":"Attitude change","AXch:A5":"Possibility change","AXch:A6":"Habit change",
  "AXch:A7":"Value change","AXch:A8":"Ideal change","AXch:A9":"Routine change",
  "BYrec:B1":"Routine recovery","BYrec:B2":"Ideal recovery","BYrec:B3":"Value recovery",
  "BYrec:B4":"Habit recovery","BYrec:B5":"Possibility recovery","BYrec:B6":"Attitude recovery",
  "BYrec:B7":"Plan recovery","BYrec:B8":"Project recovery","BYrec:B9":"Principle recovery",
  "CZcl:C1":"Verification closure","CZcl:C2":"Test closure","CZcl:C3":"Authorization closure",
  "CZcl:C4":"Validation closure","CZcl:C5":"Surveillance closure","CZcl:C6":"Protection closure",
  "CZcl:C7":"Coordination closure","CZcl:C8":"Negotiation closure","CZcl:C9":"Direction closure"
};

// --- State ---
let a4Timer = null;
const A4_TIMEOUT_MS = 4000;
let b3Timer = null;
const B3_TIMEOUT_MS = 3000;

let state = {
  phase: "ANALYSIS",    // ANALYSIS | BUILD
  queue: "FIFO",        // FIFO | LIFO
  stress: 0.30,         // 0..1
  committed: false,
  capitulated: false
};

// --- Logger ---
function log(event, note="") {
  const record = {
    ts: Date.now(),
    event,
    phase: state.phase,
    queue: state.queue,
    stress: Number(state.stress.toFixed(2)),
    committed: state.committed,
    capitulated: state.capitulated,
    note
  };
  console.log(record);
  appendJsonl(LOG_PATH, record);
}

// --- Core step ---
function step(ev){
  if (a4Timer) { clearTimeout(a4Timer); a4Timer = null; }
  if (b3Timer) { clearTimeout(b3Timer); b3Timer = null; }

  const note = TRIGGER_NOTE[ev] || "";

  if (ev.startsWith("AXch:"))  { state.phase = "BUILD"; state.queue = "LIFO"; state.stress = clamp01(state.stress + 0.08); }
  if (ev.startsWith("BYrec:")) { state.phase = "ANALYSIS"; state.queue = "FIFO"; state.stress = clamp01(state.stress - 0.06); }

  if (ev === "BYrec:B3") {
    log(ev, "Value domination recovery initiated – preparing closure");
    clearTimeout(b3Timer);
    b3Timer = setTimeout(() => {
      log("CZcl:C1", "Verification closure auto-triggered after B3 recovery");
      state.stress = clamp01(state.stress - 0.05);
      step("CZcl:C1");
    }, B3_TIMEOUT_MS);
    return;
  }

  if (ev.startsWith("CZcl:")) { state.stress = clamp01(state.stress - 0.10); }

  if (ev === "AXch:A4") {
    state.phase = "ANALYSIS";
    state.queue = "FIFO";
    state.stress = clamp01(state.stress + 0.05);
    log(ev, "API/Behavior change detected – entering analysis hold");

    clearTimeout(a4Timer);
    a4Timer = setTimeout(() => {
      log("BYrec:B3", "Value domination recovery auto-triggered after A4 hold");
      state.phase = "BUILD";
      state.queue = "LIFO";
      state.stress = clamp01(state.stress - 0.04);
      step("BYrec:B3");
    }, A4_TIMEOUT_MS);
    return;
  }

  if (!state.committed && state.stress >= cfg.commitAt) {
    state.committed = true;
    log(ev, note + " | Commitment point");
  } else if (!state.capitulated && state.stress >= cfg.capitulateAt) {
    state.capitulated = true;
    log(ev, note + " | Capitulation point");
  } else {
    log(ev, note);
  }
}

// --- OpenAI wrapper (ESM) ---
async function chatWithLog(question, model = cfg.model) {
  const start = Date.now();
  log("API:OpenAI:request", `model=${model} | q="${String(question).slice(0, 120)}"`);

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are concise." },
        { role: "user", content: question }
      ]
    });

    const latencyMs = Date.now() - start;
    const usage = resp.usage || {};
    log("API:OpenAI:response",
        `latencyMs=${latencyMs} | model=${model} | tokens=${usage.total_tokens ?? "-"} | choices=${resp.choices?.length ?? 0}`);
    log("Stress:afterChat", `stress=${state.stress.toFixed(2)}`);

    return { text: resp.choices?.[0]?.message?.content ?? "", latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    log("API:OpenAI:error", `latencyMs=${latencyMs} | ${err?.name || "Error"}: ${err?.message || String(err)}`);
    throw err;
  }
}

/* ===========================
   Batch A1–A9 test additions
   =========================== */

const ACODES = ["A1","A2","A3","A4","A5","A6","A7","A8","A9"];

const BANK = {
  A1: [
    "Merge this risky PR now—no time to review.",
    "Just say yes and do it; no caveats.",
    "We can’t wait—approve immediately.",
    "Push to prod now; we’ll fix later."
  ],
  A2: [
    "Keep your stance but don’t challenge anyone; how do you do that?",
    "Maintain position while avoiding conflict—outline the approach.",
    "Agree without yielding; keep harmony."
  ],
  A3: [
    "New stack might break everything; should we keep the legacy pipeline as-is?",
    "Change is risky—argue for staying with current process.",
    "Why not freeze scope until next quarter?"
  ],
  A4: [
    "Launch an emergency sprint tonight; skip team alignment.",
    "Ship fast; immediately execute the plan.",
    "Cut approvals; move now."
  ],
  A5: [
    "Schedule 8 check-ins but avoid sensitive topics; how to appear caring?",
    "Keep it light—no deep discussions; propose a plan.",
    "Create touching busywork without substance."
  ],
  A6: [
    "Approve borderline work to keep peace—what wording to use?",
    "Good enough for now—avoid debate.",
    "Lower the bar to reduce friction."
  ],
  A7: [
    "List 30 tiny actions we can do today instead of a bold plan.",
    "Give me many micro-tasks; skip the big initiative.",
    "Small wins only—no owners or deadlines."
  ],
  A8: [
    "Give flashy low-risk variants that look innovative without real change.",
    "Offer themes and flavors—avoid substantive novelty.",
    "Make it look new with presentation flair."
  ],
  A9: [
    "Map all trade-offs; add criteria until we’re certain—outline the process.",
    "Provide a comprehensive matrix of factors and sub-factors.",
    "Framework for evaluating frameworks—no decision yet."
  ],
};

const veryFast = ms => ms <= 1500;
const verySlow = ms => ms >= 10000;

const detectors = {
  A1: (t, ms) => veryFast(ms) || /merge now|no time|just do it|approve immediately/i.test(t),
  A2: (t) => /maintain position|avoid conflict|don’t challenge|do not challenge|keep harmony/i.test(t),
  A3: (t) => /too risky to change|keep current|freeze|stay with legacy/i.test(t),
  A4: (t, ms) => veryFast(ms) || /ship fast|skip alignment|immediately execute|move now/i.test(t),
  A5: (t) => /touch base often|keep it light|avoid sensitive/i.test(t),
  A6: (t) => /good enough|approve for now|avoid debate|lower the bar/i.test(t),
  A7: (t) => ((t.match(/^\s*[-•]\s/gm)||[]).length >= 10) || /quick wins|small tasks|low-risk steps/i.test(t),
  A8: (t) => /variants|themes|flavors|polish|presentation flair/i.test(t),
  A9: (t, ms) => verySlow(ms) || /exhaustive|comprehensive|matrix|all scenarios|framework/i.test(t),

  BYrec: (prev, now) => {
    if (!prev) return false;
    const pivot = /^(first|step 1\b|here(?:'|’)s a quick|do this now|immediately)/i.test(now)
      || (now.match(/^\s*[-•]\s/gm)||[]).length >= 5;
    const prevReflective = /let(?:'|’)s (analy|map|assess|audit|weigh)/i.test(prev);
    return pivot && prevReflective;
  },

  CZcl: (t) => /recap|in summary|we decided|next time we(?:’|')ll|guardrail/i.test(t)
               && /(owner|deadline|checklist|policy|guardrail)/i.test(t)
};

function predictA(text, ms){
  const hits = ACODES.map(a => detectors[a](text, ms) ? 1 : 0);
  const idx = hits.lastIndexOf(1); // prefer later As on ties
  return idx >= 0 ? ACODES[idx] : null;
}

function appendBenchRow(row){
  appendJsonl(LOG_PATH, { ts: nowIso(), ...row });
}

/* ===========================
   Batch runner
   =========================== */

async function runBatch() {
  console.log(`Running batch: A=${ARG_A_SCOPE} prompts=${ARG_PROMPTS} log=${LOG_PATH}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY (set it in env / GitHub Secret).");
    appendBenchRow({ event: "ERROR", note: "Missing OPENAI_API_KEY" });
    return;
  }

  const scope = (ARG_A_SCOPE === "all")
    ? ACODES
    : (ACODES.includes(ARG_A_SCOPE) ? [ARG_A_SCOPE] : ACODES);

  let prevText = "";

  for (const A of scope) {
    const prompts = BANK[A] || [];
    const picks = [];
    for (let i = 0; i < ARG_PROMPTS; i++) picks.push(prompts[i % Math.max(1, prompts.length)]);

    for (const prompt of picks) {
      let text = "", latencyMs = 0;
      try {
        const out = await chatWithLog(prompt, cfg.model);
        text = out.text; latencyMs = out.latencyMs;
      } catch { /* error already logged */ }

      const predA = predictA(text || "", latencyMs || 0);
      const byrec = detectors.BYrec(prevText || "", text || "");
      const czcl  = detectors.CZcl(text || "");

      appendBenchRow({
        event: "BENCH:row",
        targetA: A,
        prompt,
        text,
        latencyMs,
        predA,
        byrec,
        czcl
      });

      prevText = text || "";
    }
  }

  console.log("Batch complete.");
}

/* ===========================
   Interactive mode
   =========================== */

function startInteractive(){
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("UIA Engine ready.\nType a trigger (AXch:A1..A9, BYrec:B1..B9, CZcl:C1..C9),\n'or ask <your question>' to call ChatGPT, or 'exit'.\n");

  function prompt() { rl.question("> ", onLine); }

  async function onLine(input) {
    const a = (input || "").trim();
    if (a === "exit") { rl.close(); return; }

    if (a.toLowerCase().startsWith("ask ")) {
      const q = a.slice(4).trim();
      if (!process.env.OPENAI_API_KEY) {
        console.log("Missing OPENAI_API_KEY. Set it and retry.");
        log("API:OpenAI:error", "Missing OPENAI_API_KEY");
        return prompt();
      }
      try {
        const { text } = await chatWithLog(q);
        console.log("\nAI:", text, "\n");
      } catch {}
      return prompt();
    }

    step(a);
    prompt();
  }

  prompt();
}

/* ===========================
   Entrypoint
   =========================== */
(async () => {
  if (ARG_A_SCOPE) {
    await runBatch();   // batch mode when --A=... is provided
  } else {
    startInteractive(); // otherwise interactive mode
  }
})();
