import { PrismaClient } from '@prisma/client';
import axios from 'axios';
const prisma = new PrismaClient();
const evo = axios.create({ baseURL: 'http://localhost:8081', headers: { apikey: '429683C4C977415CAAFCCE10F7D57E11' } });

async function run() {
  const tenantId = '9f2110ec-8ced-4c3f-9455-b7c8ab5f8800';
  const bots = await prisma.bot.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  
  const botsWithSession = bots.filter(b => b.sessionName && b.status !== 'disconnected');
  
  if (botsWithSession.length > 0) {
    await Promise.allSettled(botsWithSession.map(async (bot) => {
      try {
        const stateRes = await evo.get(`/instance/connectionState/${bot.sessionName}`);
        const state = stateRes.data.instance?.state;
        const newStatus = state === 'open' ? 'connected' : state === 'close' ? 'disconnected' : bot.status;
        if (newStatus !== bot.status) {
          await prisma.bot.updateMany({ where: { id: bot.id }, data: { status: newStatus } });
          bot.status = newStatus;
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          bot.status = 'disconnected';
        }
      }
    }));
  }
  
  const formattedBots = bots.map(bot => {
    return { id: bot.id, name: bot.displayName, status: bot.status, lastConnected: bot.updatedAt.toISOString() };
  });
  console.log(JSON.stringify(formattedBots, null, 2));
}

run().finally(() => prisma.$disconnect());
