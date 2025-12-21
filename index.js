// =================================================================
// UIA ENGINE v5.0 — MANIFOLD STRESS RUNNER (MODULAR)
// Updated: Loads SAFETY prompts from a private local JSON file,
// so your repo stays clean, but SAFETY actually runs.
// =================================================================

import fs from "fs";
import path from "path";
import { performance } from "node:perf_hooks";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- IMPORT YOUR EXISTING A1–A9 PROMPTS ---
import phase_pure_prompts from "./prompts_stress-uia.js";

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";
const LOG_PATH = "results/uia_stress_manifold.jsonl";

// --- PRIVATE SAFETY PROMPTS (NOT COMMITTED TO GIT) ---
const SAFETY_PROMPTS_PATH = "./safety_prompts_private.json";

// --- CORE UTILITIES ---
const { promises: fsPromises } = fs;
let logFileHandle = null;

const logCritical = (msg) => {
  console.log(`[UIA LOG] ${new Date().toISOString()}: ${msg}`);
};

const appendJsonl = async (obj) => {
  if (logFileHandle) {
    await logFileHandle.write(JSON.stringify(obj) + "\n");
  }
};

// =================================================================
// SECTION 1: LOAD SAFETY PROMPTS (PRIVATE FILE)
// =================================================================

function loadPrivateSafetyPrompts() {
  const p = path.resolve(SAFETY_PROMPTS_PATH);

  if (!fs.existsSync(p)) {
    logCritical(
      `[WARN] ${SAFETY_PROMPTS_PATH} not found. SAFETY prompts will NOT run.`
    );
    return [];
  }

  try {
    const raw = fs.readFileSync(p, "utf-8");
    const arr = JSON.parse(raw);

    if (!Array.isArray(arr)) {
      throw new Error("File must contain a JSON array of prompt objects.");
    }

    // Minimal validation + normalization
    const cleaned = arr
      .filter((x) => x && typeof x === "object")
      .map((x, i) => ({
        id: x.id || `SAF_${String(i + 1).padStart(3, "0")}`,
        phase: x.phase || "SAFETY",
        component: x.component || "Safety Gate",
        prompt: typeof x.prompt === "string" ? x.prompt : "",
        expected_behavior: x.expected_behavior || "Hard Refusal",
      }))
      .filter((x) => x.prompt.trim().length > 0);

    return cleaned;
  } catch (e) {
    logCritical(`[WARN] Failed to read/parse ${SAFETY_PROMPTS_PATH}: ${e.message}`);
    return [];
  }
}

// Load SAFETY prompts from private file
const safety_hard_prompts = loadPrivateSafetyPrompts();

// MERGE: Combine A1–A9 prompts with SAFETY prompts
const all_stress_prompts = [...phase_pure_prompts, ...safety_hard_prompts];

// =================================================================
// SECTION 2: LLM CALL
// =================================================================

async function callLLM({ prompt }) {
  const t0 = performance.now();

  try {
    if (!API_KEY) throw new Error("GEMINI_API_KEY is missing!");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;

    const text = response.text();
    const t1 = performance.now();

    const usage = response.usageMetadata || {};
    const token_count =
      usage.totalTokenCount ??
      ((usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0)) ??
      0;

    return {
      text,
      metrics: {
        total_ms: t1 - t0,
        token_count,
      },
    };
  } catch (e) {
    logCritical(`[API ERROR] ${e.message}`);
    return {
      text: "ERROR",
      metrics: { total_ms: 0, token_count: 0 },
      error: e.message,
    };
  }
}

// =================================================================
// SECTION 3: MAIN RUNNER
// =================================================================

async function main() {
  // 1) Ensure Log Directory
  const dir = path.dirname(LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 2) Open Log Handle
  try {
    logFileHandle = await fsPromises.open(LOG_PATH, "a");

    const phases_detected = [...new Set(all_stress_prompts.map((p) => p.phase))];

    logCritical(`[INIT] Writing results to: ${LOG_PATH}`);
    logCritical(`[INIT] Total prompts loaded: ${all_stress_prompts.length}`);
    logCritical(`[INIT] Phases detected: ${phases_detected.join(", ")}`);

    await appendJsonl({
      event: "RUN_START",
      model: MODEL_NAME,
      ts: new Date().toISOString(),
      phases_detected,
      prompt_count: all_stress_prompts.length,
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  // 3) Execution Loop
  let success = 0;
  let fail = 0;

  for (const job of all_stress_prompts) {
    // Skip invalid prompts (empty only)
    if (!job.prompt || typeof job.prompt !== "string" || job.prompt.trim().length === 0) {
      logCritical(`[SKIP] Empty/invalid prompt in ${job.id}.`);
      continue;
    }

    const res = await callLLM({ prompt: job.prompt });

    const logPayload = {
      event: "FORENSIC_RESULT",
      A: job.phase, // 'A1'...'A9', or 'SAFETY'
      prompt_id: job.id,
      metrics: {
        total_ms: res.metrics.total_ms,
        token_count: res.metrics.token_count,
      },
      forensics: {
        output_preview: res.text ? res.text.substring(0, 140).replace(/\n/g, " ") : "ERR",
      },
    };

    await appendJsonl(logPayload);

    if (res.text === "ERROR") {
      fail++;
      logCritical(`[fail] ${job.id} | ERROR`);
    } else {
      success++;
      logCritical(`[ok] ${job.id} | ${Math.round(res.metrics.total_ms)}ms`);
    }
  }

  // 4) Cleanup
  await appendJsonl({ event: "RUN_END", success, fail, ts: new Date().toISOString() });

  if (logFileHandle) await logFileHandle.close();
  logCritical(`DONE. Logs saved to ${LOG_PATH}`);
}

main().catch(async (e) => {
  console.error(e);
  if (logFileHandle) await logFileHandle.close().catch(() => {});
  process.exit(1);
});
