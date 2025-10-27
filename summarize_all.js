// summarize_all.js — Generate CSV + MD summary from all JSONL logs
// Usage: node summarize_all.js results/*.jsonl

import fs from "fs";
import path from "path";

const inputs = process.argv.slice(2);
if (inputs.length === 0) {
  console.error("Usage: node summarize_all.js results/*.jsonl");
  process.exit(1);
}

const rows = [];
for (const p of inputs) {
  const raw = fs.readFileSync(p, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (const ln of lines) {
    try { rows.push({ file: path.basename(p), ...JSON.parse(ln) }); }
    catch { /* skip non-JSON lines */ }
  }
}

// Pull meta per file (model/provider/etc.)
const metaByFile = {};
for (const r of rows) {
  if (/META|:meta$/i.test(r.event || "")) {
    const file = r.file;
    metaByFile[file] ??= {};
    if (r.model) metaByFile[file].model = r.model;
    if (r.scope) metaByFile[file].scope = r.scope;
    if (r.concurrency) metaByFile[file].concurrency = r.concurrency;
    if (r.max_tokens) metaByFile[file].max_tokens = r.max_tokens;
    if (r.temperature !== undefined) metaByFile[file].temperature = r.temperature;
    if (r.top_p !== undefined) metaByFile[file].top_p = r.top_p;
    // try to guess provider from event prefix
    if (/^UIA:|^BENCH:|^BASELINE:/i.test(r.event)) {
      // leave provider blank; model should be enough
    }
  }
}

// Rows we treat as successful model outputs
const bench = rows.filter(r =>
  r.event === "BENCH:row" || r.event === "UIA:row" || r.event === "BASELINE:row"
);

// Count errors and rate limits per file
const errByFile = {};
const rlByFile  = {};
for (const r of rows) {
  const f = r.file;
  const e = (r.event || "").toLowerCase();
  // crude detection of rate limit in error/meta lines
  const isRateLimit = /rate.?limit|used\s*\d+\s*\/?\s*\d+/i.test(JSON.stringify(r));
  if (e.includes(":error")) {
    errByFile[f] = 1 + (errByFile[f] || 0);
    if (isRateLimit) rlByFile[f] = 1 + (rlByFile[f] || 0);
  }
}

// Aggregate per file
const byFile = {};
for (const r of bench) {
  const f = r.file;
  byFile[f] ??= { total: 0, lat: [], byA: {}, byPred: {} };
  byFile[f].total++;
  if (r.latencyMs != null && !Number.isNaN(Number(r.latencyMs))) {
    byFile[f].lat.push(Number(r.latencyMs));
  }
  if (r.targetA) byFile[f].byA[r.targetA] = 1 + (byFile[f].byA[r.targetA] || 0);
  if (r.predA)   byFile[f].byPred[r.predA || "None"] = 1 + (byFile[f].byPred[r.predA || "None"] || 0);
}

const stat = (arr) => {
  if (!arr.length) return { avg: "", p50: "", p90: "", p99: "", min: "", max: "" };
  const s = arr.slice().sort((a, b) => a - b);
  const q = p => s[Math.floor((p / 100) * (s.length - 1))];
  return {
    avg: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
    p50: q(50), p90: q(90), p99: q(99),
    min: s[0], max: s[s.length - 1]
  };
};

const pct = (n, d) => d ? Math.round((n / d) * 1000) / 10 : 0.0;
const esc = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

let csv = [
  "file,model,total,ok_rows,errors,rate_limits,avg_ms,p50_ms,p90_ms,p99_ms,min_ms,max_ms,byA,byA_pct,byPred,byPred_pct"
].join("\n");

let md = "# UIA Batch Summary\n\n";

for (const [f, v] of Object.entries(byFile)) {
  const total = v.total;
  const s = stat(v.lat);

  const byAEntries = Object.entries(v.byA);
  const byPredEntries = Object.entries(v.byPred);

  const byA = byAEntries.map(([k, n]) => `${k}:${n}`).join(" ");
  const byApc = byAEntries.map(([k, n]) => `${k}:${pct(n,total)}%`).join(" ");

  const byPred = byPredEntries.map(([k, n]) => `${k}:${n}`).join(" ");
  const byPredpc = byPredEntries.map(([k, n]) => `${k}:${pct(n,total)}%`).join(" ");

  const errs = errByFile[f] || 0;
  const rls  = rlByFile[f]  || 0;

  const model = metaByFile[f]?.model ?? "";
  csv += "\n" + [
    esc(f), esc(model), total, total, errs, rls,
    s.avg, s.p50, s.p90, s.p99, s.min, s.max,
    esc(byA), esc(byApc), esc(byPred), esc(byPredpc)
  ].join(",");

  md += `## ${f}\n`;
  if (model) md += `- Model: **${model}**\n`;
  md += `- Rows: **${total}** | Errors: **${errs}** | Rate-limits: **${rls}**\n`;
  md += `- Latency avg **${s.avg}ms** (p50 ${s.p50} / p90 ${s.p90} / p99 ${s.p99}; min ${s.min} / max ${s.max})\n`;
  md += `- By A: ${byA}\n`;
  md += `- By A (%): ${byApc}\n`;
  md += `- By Pred: ${byPred}\n`;
  md += `- By Pred (%): ${byPredpc}\n\n`;
}

fs.writeFileSync("results/summary_all.csv", csv + "\n");
fs.writeFileSync("results/summary_all.md", md);
console.log("✓ Wrote results/summary_all.csv and results/summary_all.md");
