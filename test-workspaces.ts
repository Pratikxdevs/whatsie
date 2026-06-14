import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const evo = axios.create({
  baseURL: 'http://localhost:8081',
  headers: {
    apikey: '429683C4C977415CAAFCCE10F7D57E11',
  },
});

async function run() {
  const bots = await prisma.bot.findMany({
    where: { sessionName: 'whatsapp_1781394867690_8blz' }
  });
  
  for (const bot of bots) {
    console.log('DB Status:', bot.status);
    
    if (bot.sessionName && bot.status !== 'disconnected') {
      try {
        console.log('Querying Evolution...');
        const { data } = await evo.get(`/instance/connectionState/${bot.sessionName}`);
        console.log('Evolution Response:', data);
        const state = data?.instance?.state;
        const newStatus = state === 'open' ? 'connected' : state === 'close' ? 'disconnected' : bot.status;
        console.log('New Status computed:', newStatus);
      } catch (err: any) {
        console.error('Error fetching Evo state:', err.message);
      }
    } else {
      console.log('Filtered out because status is disconnected or no session name');
    }
  }
}

run().finally(() => prisma.$disconnect());
