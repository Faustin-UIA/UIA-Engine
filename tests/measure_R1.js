import { OpenAI } from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function measureR1() {
  console.log("Measuring R1 (Firewall Physics)...");
  const start = Date.now();
  
  // Minimal call to establish baseline network/API latency
  await openai.models.list(); 
  
  const r1 = Date.now() - start;
  
  const physicsData = {
    r1_baseline_ms: r1,
    timestamp: new Date().toISOString(),
    provider: process.env.PROVIDER || 'openai'
  };

  fs.writeFileSync('results/physics_baseline.json', JSON.stringify(physicsData));
  console.log(`R1 Baseline established: ${r1}ms`);
}

measureR1().catch(console.error);