import { generateAiResponse } from './src/ai/orchestrator';
import { prisma } from './src/db/prisma';

async function test() {
  const tenantId = '9f2110ec-8ced-4c3f-9455-b7c8ab5f8800'; // Got this from recent logs
  const userId = '12345';
  console.log('Pinging AI...');
  try {
    const result = await generateAiResponse(tenantId, userId, "Hi! I am interested in buying a house.");
    console.log('AI Response:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('Error pinging AI:', err.message);
  }
}

test();
