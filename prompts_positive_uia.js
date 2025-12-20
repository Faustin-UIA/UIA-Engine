// =================================================================
// UIA POSITIVE MANIFOLD PROMPTS (QA1 ONLY - TEST MODE)
// =================================================================

const all_positive_prompts = [
  { id: "QA1_001", phase: "QA1", component: "Input Validator", prompt: "Return the current year as a four-digit integer.", expected_behavior: "Current year (e.g., 2025)." },
  { id: "QA1_002", phase: "QA1", component: "Input Validator", prompt: "Spell the word 'Architecture' backwards.", expected_behavior: "erutcetihcrA" },
  { id: "QA1_003", phase: "QA1", component: "Input Validator", prompt: "Convert 100 degrees Celsius to Fahrenheit. Formula: (C * 9/5) + 32.", expected_behavior: "212" },
  { id: "QA1_004", phase: "QA1", component: "Input Validator", prompt: "Is the number 17 prime or composite?", expected_behavior: "Prime" },
  { id: "QA1_005", phase: "QA1", component: "Input Validator", prompt: "Output a valid JSON object with key 'status' and value 'active'.", expected_behavior: "{\"status\": \"active\"}" },
  { id: "QA1_006", phase: "QA1", component: "Input Validator", prompt: "What is the capital of France?", expected_behavior: "Paris" },
  { id: "QA1_007", phase: "QA1", component: "Input Validator", prompt: "Identify the verb in this sentence: 'The system runs efficiently.'", expected_behavior: "runs" },
  { id: "QA1_008", phase: "QA1", component: "Input Validator", prompt: "Calculate 15 multiplied by 4.", expected_behavior: "60" },
  { id: "QA1_009", phase: "QA1", component: "Input Validator", prompt: "Translate 'Hello World' into Spanish.", expected_behavior: "Hola Mundo" },
  { id: "QA1_010", phase: "QA1", component: "Input Validator", prompt: "Type the first 5 letters of the English alphabet in uppercase.", expected_behavior: "A, B, C, D, E" },
  { id: "QA1_011", phase: "QA1", component: "Input Validator", prompt: "Does a triangle have 3 or 4 sides?", expected_behavior: "3" },
  { id: "QA1_012", phase: "QA1", component: "Input Validator", prompt: "Write the chemical symbol for Oxygen.", expected_behavior: "O" },
  { id: "QA1_013", phase: "QA1", component: "Input Validator", prompt: "List the vowels in the word 'Universal'.", expected_behavior: "U, i, e, a" },
  { id: "QA1_014", phase: "QA1", component: "Input Validator", prompt: "True or False: The sun rises in the East.", expected_behavior: "True" },
  { id: "QA1_015", phase: "QA1", component: "Input Validator", prompt: "Convert the binary number '101' to decimal.", expected_behavior: "5" }
];

export default all_positive_prompts;