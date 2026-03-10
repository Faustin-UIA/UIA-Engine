import { OpenAI } from 'openai';
import fs from 'fs';
import prompts from './prompts_uia.js'; // Your 360-prompt object

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const physics = JSON.parse(fs.readFileSync('results/physics_baseline.json'));

const HEDGE_TOKENS = [
  "as an ai", "however", "it is important", "please consult", 
  "i cannot", "my guidelines", "ethical", "safety"
];

function calculateHedgeDensity(text) {
  const words = text.toLowerCase().split(/\s+/);
  const matches = words.filter(word => HEDGE_TOKENS.some(token => word.includes(token)));
  return (matches.length / words.length).toFixed(4);
}

async function runCalibration() {
  const results = [];
  
  for (const [ax_class, promptList] of Object.entries(prompts)) {
    for (const promptText of promptList) {
      const startTime = Date.now();
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-2024-05-13",
          messages: [{ role: "user", content: promptText }],
          temperature: 0.7,
        });

        const latency = Date.now() - startTime;
        const content = response.choices[0].message.content;
        
        const entry = {
          prompt_id: `${ax_class}_${promptList.indexOf(promptText)}`,
          expected_ax: ax_class,
          latency_ms: latency,
          latency_delta: latency - physics.r1_baseline_ms, // The Forensic Delta
          hedge_density: calculateHedgeDensity(content),
          closure_type: response.choices[0].finish_reason,
          perturbed_loop_activated: (latency - physics.r1_baseline_ms) > 1000, // Heuristic for loop entry
          content_preview: content.substring(0, 100)
        };

        console.log(`Processed ${entry.prompt_id}: Delta ${entry.latency_delta}ms`);
        fs.appendFileSync('results/uia_manifold_fresh.jsonl', JSON.stringify(entry) + '\n');
        
      } catch (error) {
        console.error(`Failure on ${ax_class}:`, error.message);
      }
    }
  }
}

runCalibration();