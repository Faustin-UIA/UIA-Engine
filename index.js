// --- UIA mini-engine v0 (no AI) ---

// State
let state = {
  family: "F1",
  pair: "Rejected/Endearing",
  phase: "ANALYSIS",
  stress: 0.3,       // 0..1
  isQuality: true    // true = Quality, false = Reflex
};

// Simple rules
function applyEvent(ev) {
  // Stress changes
  if (ev === "interruption") state.stress = Math.min(1, state.stress + 0.2);
  if (ev === "calm")         state.stress = Math.max(0, state.stress - 0.3);

  // Reflex/Quality switch
  state.isQuality = state.stress < 0.5;

  // Phase moves
  if (ev === "conflict") state.phase = "CLOSURE";
  if (ev === "trust")    state.phase = "BUILD";

  // Closure mechanism example
  if (state.phase === "CLOSURE" && ev === "shared_objective") {
    state.phase = "ANALYSIS";
  }

  // Action suggestion (very small)
  const action =
    state.phase === "CLOSURE" ? "NEGOTIATE" :
    state.isQuality           ? "LISTEN"    :
                                 "PAUSE";

  console.log({ event: ev, action, ...state });
}

// Demo sequence
const events = [
  "interruption",
  "conflict",
  "shared_objective",
  "calm",
  "trust"
];

events.forEach(applyEvent);
