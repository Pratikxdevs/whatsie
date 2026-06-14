const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function run() {
  const pepper = process.env.API_KEY_PEPPER || 'test-pepper';
  const key = 'test-api-key';
  const hash = crypto.createHmac('sha256', pepper).update(key).digest('hex');
  
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error('No tenant');
  
  await prisma.apiKey.create({
    data: { name: 'Test Key', keyHash: hash, tenantId: tenant.id }
  });
  console.log('CREATED');
}

run();
