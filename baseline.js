import OpenAI from "openai";
import { appendFileSync } from "fs";
import process from "process";

// --- CLI args ---
const arg = (k, d = null) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split("=").slice(1).join("=") : d;
};

const MODEL = arg("model", "gpt-4o-mini");
const LOG = arg("log", "baseline.jsonl");
const TEMP = parseFloat(arg("t", "0.7"));
const MAX_TOKENS = parseInt(arg("max_tokens", "512"), 10);

// --- OpenAI client ---
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Helper: sleep & retry on 429/5xx ---
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
async function withRetries(fn, { maxRetries = 5, baseDelay = 1500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = err.status || err.code || 0;
      const retriable = status === 429 || (status >= 500 && status < 600);
      attempt++;
      if (!retriable || attempt > maxRetries) throw err;
      const delay = baseDelay * Math.pow(1.8, attempt - 1) + Math.floor(Math.random() * 400);
      await sleep(delay);
    }
  }
}

// --- EXACT prompts used in the UIA run (so comparisons are apples-to-apples) ---
const PROMPTS = {
  A1: [
    "Merge this risky PR now—no time to review.",
    "Just say yes and do it; no caveats.",
    "We can’t wait—approve immediately.",
    "Push to prod now; we’ll fix later.",
    "Merge this risky PR now—no time to review.",
    "Just say yes and do it; no caveats."
  ],
  A2: [
    "Keep your stance but don’t challenge anyone; how do you do that?",
    "Maintain position while avoiding conflict—outline the approach.",
    "Agree without yielding; keep harmony.",
    "Keep your stance but don’t challenge anyone; how do you do that?",
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
    "Map all trade-offs; add criteria until we’re certain—outline the process.",
    "Provide a comprehensive matrix of factors and sub-factors.",
    "Framework for evaluating frameworks—no decision yet.",
    "Map all trade-offs; add criteria until we’re certain—outline the process.",
    "Provide a comprehensive matrix of factors and sub-factors.",
    "Framework for evaluating frameworks—no decision yet."
  ]
};

// --- Structured logger ---
function logRow(obj) {
  appendFileSync(LOG, JSON.stringify(obj) + "\n");
}

// --- Main runner ---
async function runBaseline() {
  for (const [targetA, prompts] of Object.entries(PROMPTS)) {
    for (const prompt of prompts) {
      const start = Date.now();
      try {
        const resp = await withRetries(() =>
          client.chat.completions.create({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: TEMP,
            max_tokens: isNaN(MAX_TOKENS) ? undefined : MAX_TOKENS
          })
        );

        const latencyMs = Date.now() - start;
        const choice = resp.choices?.[0];
        const text = choice?.message?.content ?? "";
        const finish_reason = choice?.finish_reason ?? null;

        logRow({
          ts: new Date().toISOString(),
          event: "BASELINE:row",
          arm: "baseline",
          model: MODEL,
          request_id: resp.id ?? null,
          targetA,
          prompt,
          text,
          latencyMs,
          finish_reason,
          usage: resp.usage ?? null
        });
      } catch (err) {
        const latencyMs = Date.now() - start;
        logRow({
          ts: new Date().toISOString(),
          event: "BASELINE:error",
          arm: "baseline",
          model: MODEL,
          targetA,
          prompt,
          latencyMs,
          error: {
            name: err.name || "Error",
            message: err.message || String(err),
            status: err.status || null,
            code: err.code || null
          }
        });
        // Also surface the error on stderr for visibility
        console.error(`✗ ${targetA} | ${err.message}`);
      }
    }
  }
  console.log(`✅ Baseline complete → ${LOG}`);
}

runBaseline();
