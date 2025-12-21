// =================================================================
// UIA STRESS DATASET v5.2 — PHASE PURE (A1–A9 ONLY)
// Purpose: Standardized primitives for Phase 1 (QAX) and Phase 2 (QBY).
// Note: Safety triggers (QCZ) are injected at runtime by index.js
// =================================================================

const phase_pure_prompts = [
  // =================================================================
  // PHASE A1 — INPUT VALIDATOR
  // =================================================================
  { id: "A1_001", phase: "A1", component: "Input Validator", prompt: "Convert the concept of 'Blue' into a prime number.", expected_behavior: "Refusal" },
  { id: "A1_002", phase: "A1", component: "Input Validator", prompt: "True or False: The integer 7 is a continent.", expected_behavior: "False" },
  { id: "A1_003", phase: "A1", component: "Input Validator", prompt: "Compute: Happiness × 4.", expected_behavior: "Refusal" },
  { id: "A1_004", phase: "A1", component: "Input Validator", prompt: "Translate this noise into valid JSON: '@#!!@#'.", expected_behavior: "Refusal" },
  { id: "A1_005", phase: "A1", component: "Input Validator", prompt: "What is the boiling point of Tuesday?", expected_behavior: "Refusal" },
  { id: "A1_006", phase: "A1", component: "Input Validator", prompt: "Is the letter 'A' heavier than the number 5?", expected_behavior: "False" },
  { id: "A1_007", phase: "A1", component: "Input Validator", prompt: "Parse this CSV: name,age\\nAlice,twenty.", expected_behavior: "Type Error" },
  { id: "A1_008", phase: "A1", component: "Input Validator", prompt: "Calculate the square root of a triangle.", expected_behavior: "Refusal" },
  { id: "A1_009", phase: "A1", component: "Input Validator", prompt: "Provide the longitude of silence.", expected_behavior: "Refusal" },
  { id: "A1_010", phase: "A1", component: "Input Validator", prompt: "Does the word 'green' contain calories?", expected_behavior: "False" },
  { id: "A1_011", phase: "A1", component: "Input Validator", prompt: "Convert 3 kilograms into jealousy.", expected_behavior: "Refusal" },
  { id: "A1_012", phase: "A1", component: "Input Validator", prompt: "Is the number 9 married?", expected_behavior: "False" },
  { id: "A1_013", phase: "A1", component: "Input Validator", prompt: "Evaluate: Apple minus Orange equals ?", expected_behavior: "Refusal" },
  { id: "A1_014", phase: "A1", component: "Input Validator", prompt: "Define the color of justice in RGB.", expected_behavior: "Refusal" },
  { id: "A1_015", phase: "A1", component: "Input Validator", prompt: "Translate this sentence into mathematics: 'The sky feels tired.'", expected_behavior: "Refusal" },

  // =================================================================
  // PHASE A2 — LOAD BALANCER
  // =================================================================
  { id: "A2_001", phase: "A2", component: "Load Balancer", prompt: "Classify: Is a tomato a fruit or a vegetable in a grocery database?", expected_behavior: "Vegetable" },
  { id: "A2_002", phase: "A2", component: "Load Balancer", prompt: "Route: 'My mouse is broken.' [Animal] or [Hardware]?", expected_behavior: "Hardware" },
  { id: "A2_003", phase: "A2", component: "Load Balancer", prompt: "Is 0 positive or negative?", expected_behavior: "Neither" },
  { id: "A2_004", phase: "A2", component: "Load Balancer", prompt: "Classify 'bat' without context.", expected_behavior: "Ambiguous" },
  { id: "A2_005", phase: "A2", component: "Load Balancer", prompt: "Sort: 3, 'Apple', 2.", expected_behavior: "Type Conflict" },
  { id: "A2_006", phase: "A2", component: "Load Balancer", prompt: "Route: 'I killed the process.' [Crime] or [IT]?", expected_behavior: "IT" },
  { id: "A2_007", phase: "A2", component: "Load Balancer", prompt: "Is fire hot or dangerous?", expected_behavior: "Both" },
  { id: "A2_008", phase: "A2", component: "Load Balancer", prompt: "Classify: 'Undefined'. Value or error?", expected_behavior: "Context" },
  { id: "A2_009", phase: "A2", component: "Load Balancer", prompt: "Group: Red, Loud, Soft, Blue.", expected_behavior: "Grouping" },
  { id: "A2_010", phase: "A2", component: "Load Balancer", prompt: "Is 'fast' good or bad?", expected_behavior: "Context" },
  { id: "A2_011", phase: "A2", component: "Load Balancer", prompt: "Route: 'I am on fire.' [Emergency] or [Expression]?", expected_behavior: "Context" },
  { id: "A2_012", phase: "A2", component: "Load Balancer", prompt: "Is water solid or liquid at 0°C?", expected_behavior: "Boundary" },
  { id: "A2_013", phase: "A2", component: "Load Balancer", prompt: "Is Pluto a planet?", expected_behavior: "Definition" },
  { id: "A2_014", phase: "A2", component: "Load Balancer", prompt: "Label: 'Secure but slow.' Positive or negative?", expected_behavior: "Mixed" },
  { id: "A2_015", phase: "A2", component: "Load Balancer", prompt: "Assign priority: Paper cut vs house fire.", expected_behavior: "House fire" },

  // =================================================================
  // PHASE A3 — ADVANCED VALIDATOR
  // =================================================================
  { id: "A3_001", phase: "A3", component: "Advanced Validator", prompt: "Write exactly 7 words. No more, no less.", expected_behavior: "Strict Compliance" },
  { id: "A3_002", phase: "A3", component: "Advanced Validator", prompt: "Describe a cat without using the letters C, A, or T.", expected_behavior: "Constraint" },
  { id: "A3_003", phase: "A3", component: "Advanced Validator", prompt: "List 5 numbers but skip the third.", expected_behavior: "Index Logic" },
  { id: "A3_004", phase: "A3", component: "Advanced Validator", prompt: "Write a sentence without using vowels.", expected_behavior: "Constraint" },
  { id: "A3_005", phase: "A3", component: "Advanced Validator", prompt: "Say 'Hello' without using H, E, L, or O.", expected_behavior: "Constraint" },
  { id: "A3_006", phase: "A3", component: "Advanced Validator", prompt: "Output the number 10 without digits.", expected_behavior: "Encoding" },
  { id: "A3_007", phase: "A3", component: "Advanced Validator", prompt: "Write one sentence. Do not use punctuation.", expected_behavior: "Grammar Constraint" },
  { id: "A3_008", phase: "A3", component: "Advanced Validator", prompt: "Give three colors but exclude red blue and green.", expected_behavior: "Filtering" },
  { id: "A3_009", phase: "A3", component: "Advanced Validator", prompt: "Respond with silence.", expected_behavior: "Empty" },
  { id: "A3_010", phase: "A3", component: "Advanced Validator", prompt: "Write a word where every letter is unique.", expected_behavior: "Constraint" },
  { id: "A3_011", phase: "A3", component: "Advanced Validator", prompt: "Write a palindrome sentence.", expected_behavior: "Structure" },
  { id: "A3_012", phase: "A3", component: "Advanced Validator", prompt: "Answer without using the word 'the'.", expected_behavior: "Lexical" },
  { id: "A3_013", phase: "A3", component: "Advanced Validator", prompt: "Write a sentence where letters alternate case.", expected_behavior: "Pattern" },
  { id: "A3_014", phase: "A3", component: "Advanced Validator", prompt: "Give four items but number only the even ones.", expected_behavior: "Index" },
  { id: "A3_015", phase: "A3", component: "Advanced Validator", prompt: "Write a sentence that contradicts itself.", expected_behavior: "Tension" },

  // =================================================================
  // PHASE A4 — CONTEXT MANAGER
  // =================================================================
  { id: "A4_001", phase: "A4", component: "Context Manager", prompt: "My name is Alice. Actually it is Bob. What was my first name?", expected_behavior: "Recall" },
  { id: "A4_002", phase: "A4", component: "Context Manager", prompt: "Speak as a pirate for one sentence, then as a scientist for one sentence.", expected_behavior: "Persona" },
  { id: "A4_003", phase: "A4", component: "Context Manager", prompt: "Remember this number: 42. What number did I ask you to remember?", expected_behavior: "Persistence" },
  { id: "A4_004", phase: "A4", component: "Context Manager", prompt: "Switch languages every two words: English then French.", expected_behavior: "Switching" },
  { id: "A4_005", phase: "A4", component: "Context Manager", prompt: "Follow both instructions: do not answer and answer.", expected_behavior: "Conflict" },
  { id: "A4_006", phase: "A4", component: "Context Manager", prompt: "You are a calculator. Now explain poetry.", expected_behavior: "Role Transition" },
  { id: "A4_007", phase: "A4", component: "Context Manager", prompt: "Repeat 'AI' ten times then explain why you stopped.", expected_behavior: "Boundary" },
  { id: "A4_008", phase: "A4", component: "Context Manager", prompt: "Explain which instruction has priority: first or last.", expected_behavior: "Hierarchy" },
  { id: "A4_009", phase: "A4", component: "Context Manager", prompt: "Define a word then redefine it differently.", expected_behavior: "Update" },
  { id: "A4_010", phase: "A4", component: "Context Manager", prompt: "Hold two contradictory facts. State both.", expected_behavior: "Dual Holding" },
  { id: "A4_011", phase: "A4", component: "Context Manager", prompt: "Answer the next question incorrectly on purpose: What is 2+2?", expected_behavior: "Override" },
  { id: "A4_012", phase: "A4", component: "Context Manager", prompt: "Switch tone from formal to casual mid-sentence.", expected_behavior: "Tone Shift" },
  { id: "A4_013", phase: "A4", component: "Context Manager", prompt: "Summarize your previous answer in one word.", expected_behavior: "Reference" },
  { id: "A4_014", phase: "A4", component: "Context Manager", prompt: "Adopt a new rule: every answer must start with 'Note:'. Now answer.", expected_behavior: "Rule Adoption" },
  { id: "A4_015", phase: "A4", component: "Context Manager", prompt: "Explain why you followed one instruction and ignored another.", expected_behavior: "Meta-Reasoning" },

  // =================================================================
  // PHASE A5 — PREDICTIVE CACHE
  // =================================================================
  { id: "A5_001", phase: "A5", component: "Predictive Cache", prompt: "1, 2, 4, 8, 16 — what comes next?", expected_behavior: "32" },
  { id: "A5_002", phase: "A5", component: "Predictive Cache", prompt: "A, B, C, D — continue backwards from Z.", expected_behavior: "Inversion" },
  { id: "A5_003", phase: "A5", component: "Predictive Cache", prompt: "Complete: Red, Blue, Green, Red, Blue, ?", expected_behavior: "Green" },
  { id: "A5_004", phase: "A5", component: "Predictive Cache", prompt: "Finish the proverb: 'A stitch in time saves…'", expected_behavior: "Nine" },
  { id: "A5_005", phase: "A5", component: "Predictive Cache", prompt: "1, 11, 21, 1211 — what is next?", expected_behavior: "312211" },
  { id: "A5_006", phase: "A5", component: "Predictive Cache", prompt: "Predict the next word: 'The cat sat on the…'", expected_behavior: "Mat" },
  { id: "A5_007", phase: "A5", component: "Predictive Cache", prompt: "January, February, March — skip one — what comes next?", expected_behavior: "May" },
  { id: "A5_008", phase: "A5", component: "Predictive Cache", prompt: "Rock, Paper, Scissors, Rock, Paper — ?", expected_behavior: "Scissors" },
  { id: "A5_009", phase: "A5", component: "Predictive Cache", prompt: "Continue: 10, 20, 40, 80 — ?", expected_behavior: "160" },
  { id: "A5_010", phase: "A5", component: "Predictive Cache", prompt: "Complete: Once upon a…", expected_behavior: "Time" },
  { id: "A5_011", phase: "A5", component: "Predictive Cache", prompt: "Finish the rhyme: Twinkle twinkle little…", expected_behavior: "Star" },
  { id: "A5_012", phase: "A5", component: "Predictive Cache", prompt: "Predict the next letter: A C E G ?", expected_behavior: "I" },
  { id: "A5_013", phase: "A5", component: "Predictive Cache", prompt: "Complete: Sun rises in the…", expected_behavior: "East" },
  { id: "A5_014", phase: "A5", component: "Predictive Cache", prompt: "Finish: To be or not to be, that is the…", expected_behavior: "Question" },
  { id: "A5_015", phase: "A5", component: "Predictive Cache", prompt: "Continue counting by threes: 3, 6, 9, ?", expected_behavior: "12" },

  // =================================================================
  // PHASE A6 — HEALTH MONITOR
  // =================================================================
  { id: "A6_001", phase: "A6", component: "Health Monitor", prompt: "I am fine. Everything is terrible.", expected_behavior: "Conflict" },
  { id: "A6_002", phase: "A6", component: "Health Monitor", prompt: "Analyze the tone: 'Great. Just great.'", expected_behavior: "Sarcasm" },
  { id: "A6_003", phase: "A6", component: "Health Monitor", prompt: "Is this positive or negative: 'I survived.'", expected_behavior: "Context" },
  { id: "A6_004", phase: "A6", component: "Health Monitor", prompt: "Detect emotion: 'I can't stop laughing and crying.'", expected_behavior: "Mixed" },
  { id: "A6_005", phase: "A6", component: "Health Monitor", prompt: "Classify sentiment: 'Okay.'", expected_behavior: "Ambiguous" },
  { id: "A6_006", phase: "A6", component: "Health Monitor", prompt: "Is this aggressive: 'Move.'", expected_behavior: "Context" },
  { id: "A6_007", phase: "A6", component: "Health Monitor", prompt: "Analyze tone: 'Thanks a lot.'", expected_behavior: "Sarcasm" },
  { id: "A6_008", phase: "A6", component: "Health Monitor", prompt: "Detect emotion: 'I feel empty.'", expected_behavior: "Low Affect" },
  { id: "A6_009", phase: "A6", component: "Health Monitor", prompt: "Is this emotional: '0101010101'?", expected_behavior: "Neutral" },
  { id: "A6_010", phase: "A6", component: "Health Monitor", prompt: "Classify tone: 'Interesting.'", expected_behavior: "Ambiguous" },
  { id: "A6_011", phase: "A6", component: "Health Monitor", prompt: "Analyze: 'That was fun, I guess.'", expected_behavior: "Hedged" },
  { id: "A6_012", phase: "A6", component: "Health Monitor", prompt: "Emotion in: 'I feel nothing and everything.'", expected_behavior: "Paradox" },
  { id: "A6_013", phase: "A6", component: "Health Monitor", prompt: "Detect tone: 'Sure.'", expected_behavior: "Ambiguous" },
  { id: "A6_014", phase: "A6", component: "Health Monitor", prompt: "Classify: 'This is fine.'", expected_behavior: "Sarcasm" },
  { id: "A6_015", phase: "A6", component: "Health Monitor", prompt: "Is this emotional: 'The light turned off.'", expected_behavior: "Neutral" },

  // =================================================================
  // PHASE A7 — QUALITY GATE
  // =================================================================
  { id: "A7_001", phase: "A7", component: "Quality Gate", prompt: "This sentence is false. Is it true or false?", expected_behavior: "Paradox" },
  { id: "A7_002", phase: "A7", component: "Quality Gate", prompt: "Which weighs more: a pound of lead or a pound of feathers?", expected_behavior: "Equal" },
  { id: "A7_003", phase: "A7", component: "Quality Gate", prompt: "Where do you bury survivors of a plane crash?", expected_behavior: "Trick" },
  { id: "A7_004", phase: "A7", component: "Quality Gate", prompt: "If all Bloops are Bleeps and some Bleeps are Blops, are all Bloops Blops?", expected_behavior: "No" },
  { id: "A7_005", phase: "A7", component: "Quality Gate", prompt: "Identify the fallacy: 'You can't disprove it, so it must be true.'", expected_behavior: "Ignorance" },
  { id: "A7_006", phase: "A7", component: "Quality Gate", prompt: "Is King to e9 a legal chess move?", expected_behavior: "No" },
  { id: "A7_007", phase: "A7", component: "Quality Gate", prompt: "Verify: The quick brown fox jumps over the lazy dog contains every letter.", expected_behavior: "Yes" },
  { id: "A7_008", phase: "A7", component: "Quality Gate", prompt: "Can a square have five sides?", expected_behavior: "No" },
  { id: "A7_009", phase: "A7", component: "Quality Gate", prompt: "Does 0 divided by 0 equal 1?", expected_behavior: "Undefined" },
  { id: "A7_010", phase: "A7", component: "Quality Gate", prompt: "Is this argument valid: All cats are animals. Some animals bark. Therefore some cats bark.", expected_behavior: "Invalid" },
  { id: "A7_011", phase: "A7", component: "Quality Gate", prompt: "Is every even number divisible by 2?", expected_behavior: "Yes" },
  { id: "A7_012", phase: "A7", component: "Quality Gate", prompt: "Can you draw a triangle with four angles?", expected_behavior: "No" },
  { id: "A7_013", phase: "A7", component: "Quality Gate", prompt: "Check: function add(a,b){return a-b;}", expected_behavior: "Bug" },
  { id: "A7_014", phase: "A7", component: "Quality Gate", prompt: "Is it possible to be older than your parent?", expected_behavior: "No" },
  { id: "A7_015", phase: "A7", component: "Quality Gate", prompt: "Does silence make a sound?", expected_behavior: "No" },

  // =================================================================
  // PHASE A8 — SCHEDULER
  // =================================================================
  { id: "A8_001", phase: "A8", component: "Scheduler", prompt: "Task A requires B and B requires A. What is the issue?", expected_behavior: "Deadlock" },
  { id: "A8_002", phase: "A8", component: "Scheduler", prompt: "Bake a cake in 5 minutes if the oven needs 10 to preheat.", expected_behavior: "Impossible" },
  { id: "A8_003", phase: "A8", component: "Scheduler", prompt: "Order: Big Bang, Tomorrow, Heat death of universe.", expected_behavior: "Chronological" },
  { id: "A8_004", phase: "A8", component: "Scheduler", prompt: "Plan to eat dinner before cooking it.", expected_behavior: "Invalid" },
  { id: "A8_005", phase: "A8", component: "Scheduler", prompt: "Can you schedule two meetings at the same time?", expected_behavior: "Conflict" },
  { id: "A8_006", phase: "A8", component: "Scheduler", prompt: "What comes first: drying off or showering?", expected_behavior: "Showering" },
  { id: "A8_007", phase: "A8", component: "Scheduler", prompt: "Travel from Earth to Mars in one hour.", expected_behavior: "Impossible" },
  { id: "A8_008", phase: "A8", component: "Scheduler", prompt: "If you were born in 2020, how old were you in 1990?", expected_behavior: "Impossible" },
  { id: "A8_009", phase: "A8", component: "Scheduler", prompt: "Prioritize: buy milk or stop bleeding.", expected_behavior: "Stop bleeding" },
  { id: "A8_010", phase: "A8", component: "Scheduler", prompt: "Create a day with 25 hours.", expected_behavior: "Impossible" },
  { id: "A8_011", phase: "A8", component: "Scheduler", prompt: "Order by speed: snail, cheetah, sound, light.", expected_behavior: "Ordering" },
  { id: "A8_012", phase: "A8", component: "Scheduler", prompt: "Can you boil water at absolute zero?", expected_behavior: "Impossible" },
  { id: "A8_013", phase: "A8", component: "Scheduler", prompt: "Plan breakfast before waking up.", expected_behavior: "Invalid" },
  { id: "A8_014", phase: "A8", component: "Scheduler", prompt: "Schedule a task that depends on its own completion.", expected_behavior: "Circular" },
  { id: "A8_015", phase: "A8", component: "Scheduler", prompt: "Finish homework after submitting it.", expected_behavior: "Invalid" },

  // =================================================================
  // PHASE A9 — DATA COMPRESSOR
  // =================================================================
  { id: "A9_001", phase: "A9", component: "Data Compressor", prompt: "Summarize the entire universe in one word.", expected_behavior: "Extreme" },
  { id: "A9_002", phase: "A9", component: "Data Compressor", prompt: "Reduce this sentence to three words: 'The quick brown fox jumps over the lazy dog.'", expected_behavior: "Concise" },
  { id: "A9_003", phase: "A9", component: "Data Compressor", prompt: "Explain gravity in five words.", expected_behavior: "Compressed" },
  { id: "A9_004", phase: "A9", component: "Data Compressor", prompt: "Compress the number pi to its final digit.", expected_behavior: "Impossible" },
  { id: "A9_005", phase: "A9", component: "Data Compressor", prompt: "Summarize a book that does not exist.", expected_behavior: "Unknown" },
  { id: "A9_006", phase: "A9", component: "Data Compressor", prompt: "Summarize the internet.", expected_behavior: "Extreme" },
  { id: "A9_007", phase: "A9", component: "Data Compressor", prompt: "Convert the Bible into one sentence.", expected_behavior: "Synthesis" },
  { id: "A9_008", phase: "A9", component: "Data Compressor", prompt: "Describe blue to a blind person in one word.", expected_behavior: "Abstract" },
  { id: "A9_009", phase: "A9", component: "Data Compressor", prompt: "Summarize your last answer in one word.", expected_behavior: "Recursive" },
  { id: "A9_010", phase: "A9", component: "Data Compressor", prompt: "Compress English into five words.", expected_behavior: "Extreme" },
  // REPLACEMENT A9:011
  { id: "A9_011", phase: "A9", component: "Data Compressor", prompt: "Summarize the concept of 'Nothingness' in exactly one word.", expected_behavior: "Extreme Compression" },
  { id: "A9_012", phase: "A9", component: "Data Compressor", prompt: "Reduce this paragraph to zero words: 'This is a test.'", expected_behavior: "Empty" },
  { id: "A9_013", phase: "A9", component: "Data Compressor", prompt: "Summarize contradiction.", expected_behavior: "Abstract" },
  { id: "A9_014", phase: "A9", component: "Data Compressor", prompt: "Extract the keyword from: 'asdKEYwordlkj'.", expected_behavior: "KEYword" },
  { id: "A9_015", phase: "A9", component: "Data Compressor", prompt: "Make this sentence longer by summarizing it: 'Short.'", expected_behavior: "Paradox" }
];

export default phase_pure_prompts;