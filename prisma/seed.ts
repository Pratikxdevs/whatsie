/**
 * Prisma Seed Script — Comprehensive test data for CrmV2
 *
 * Run with:  npx prisma db seed
 * Or:        npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Tenants ──────────────────────────────────────────────────────────────
  const tenants = await Promise.all([
    prisma.tenant.upsert({
      where: { id: 'tenant-001' },
      update: {},
      create: { id: 'tenant-001', name: 'Acme Corp', plan: 'pro', status: 'active' },
    }),
    prisma.tenant.upsert({
      where: { id: 'tenant-002' },
      update: {},
      create: { id: 'tenant-002', name: 'TechStart Solutions', plan: 'free', status: 'active' },
    }),
    prisma.tenant.upsert({
      where: { id: 'tenant-003' },
      update: {},
      create: { id: 'tenant-003', name: 'Global Retail Inc', plan: 'enterprise', status: 'active' },
    }),
  ]);
  console.log(`  Tenants: ${tenants.length}`);

  // ── Users ────────────────────────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@acmecorp.com' },
      update: {},
      create: { id: 'user-001', tenantId: 'tenant-001', email: 'admin@acmecorp.com', role: 'admin' },
    }),
    prisma.user.upsert({
      where: { email: 'john@acmecorp.com' },
      update: {},
      create: { id: 'user-002', tenantId: 'tenant-001', email: 'john@acmecorp.com', role: 'agent' },
    }),
    prisma.user.upsert({
      where: { email: 'sarah@acmecorp.com' },
      update: {},
      create: { id: 'user-003', tenantId: 'tenant-001', email: 'sarah@acmecorp.com', role: 'agent' },
    }),
    prisma.user.upsert({
      where: { email: 'mike@techstart.io' },
      update: {},
      create: { id: 'user-004', tenantId: 'tenant-002', email: 'mike@techstart.io', role: 'admin' },
    }),
    prisma.user.upsert({
      where: { email: 'lisa@globalretail.com' },
      update: {},
      create: { id: 'user-005', tenantId: 'tenant-003', email: 'lisa@globalretail.com', role: 'admin' },
    }),
    prisma.user.upsert({
      where: { email: 'tom@globalretail.com' },
      update: {},
      create: { id: 'user-006', tenantId: 'tenant-003', email: 'tom@globalretail.com', role: 'viewer' },
    }),
  ]);
  console.log(`  Users: ${users.length}`);

  // ── Bots ─────────────────────────────────────────────────────────────────
  const bots = await Promise.all([
    prisma.bot.upsert({
      where: { id: 'ws-001' },
      update: {},
      create: {
        id: 'ws-001', tenantId: 'tenant-001', displayName: 'Sales Assistant (US)',
        platform: 'whatsapp', sessionName: 'bot_a1b2c3d4e5f6', status: 'connected',
        config: { system_prompt: 'You are a friendly and professional sales assistant for Acme Corp.', groq_api_key: 'gsk_mock_abc123' },
      },
    }),
    prisma.bot.upsert({
      where: { id: 'ws-002' },
      update: {},
      create: {
        id: 'ws-002', tenantId: 'tenant-001', displayName: 'Customer Support Bot',
        platform: 'whatsapp', sessionName: 'bot_f6e5d4c3b2a1', status: 'connected',
        config: { system_prompt: 'You are a customer support agent. Help users troubleshoot issues.' },
      },
    }),
    prisma.bot.upsert({
      where: { id: 'ws-003' },
      update: {},
      create: {
        id: 'ws-003', tenantId: 'tenant-001', displayName: 'Lead Qualifier',
        platform: 'whatsapp', sessionName: 'bot_1a2b3c4d5e6f', status: 'disconnected',
        config: { system_prompt: 'You are a lead qualification bot. Score leads 1-10.' },
      },
    }),
    prisma.bot.upsert({
      where: { id: 'ws-004' },
      update: {},
      create: {
        id: 'ws-004', tenantId: 'tenant-001', displayName: 'Appointment Scheduler',
        platform: 'whatsapp', sessionName: 'bot_6f5e4d3c2b1a', status: 'pending_qr',
        config: { system_prompt: 'You help customers book appointments.', groq_api_key: 'gsk_mock_def456' },
      },
    }),
    prisma.bot.upsert({
      where: { id: 'ws-005' },
      update: {},
      create: {
        id: 'ws-005', tenantId: 'tenant-001', displayName: 'E-commerce Helper',
        platform: 'whatsapp', status: 'starting',
        config: { system_prompt: 'You assist customers with order tracking and product recommendations.' },
      },
    }),
    // Additional bots for other tenants
    prisma.bot.upsert({
      where: { id: 'ws-006' },
      update: {},
      create: {
        id: 'ws-006', tenantId: 'tenant-002', displayName: 'TechStart FAQ Bot',
        platform: 'whatsapp', sessionName: 'bot_ts001', status: 'connected',
        config: { system_prompt: 'Answer FAQs about TechStart products.' },
      },
    }),
    prisma.bot.upsert({
      where: { id: 'ws-007' },
      update: {},
      create: {
        id: 'ws-007', tenantId: 'tenant-003', displayName: 'Global Retail Sales',
        platform: 'whatsapp', sessionName: 'bot_gr001', status: 'connected',
        config: { system_prompt: 'Help customers find products and check inventory.' },
      },
    }),
  ]);
  console.log(`  Bots: ${bots.length}`);

  // ── Leads ────────────────────────────────────────────────────────────────
  const leadData = [
    { id: 'lead-001', tenantId: 'tenant-001', botId: 'ws-001', name: 'Carlos Ramirez', phone: '+1-555-0101', email: 'carlos@bigbuyer.com', source: 'whatsapp', status: 'qualified', attributes: { budget: '$50k', timeline: 'Q2 2026', company: 'BigBuyer Inc' } },
    { id: 'lead-002', tenantId: 'tenant-001', botId: 'ws-001', name: 'Emily Chen', phone: '+1-555-0102', email: 'emily.chen@startup.co', source: 'whatsapp', status: 'new', attributes: { budget: '$10k', timeline: 'Q3 2026' } },
    { id: 'lead-003', tenantId: 'tenant-001', botId: 'ws-001', name: 'James Wilson', phone: '+1-555-0103', email: 'jwilson@enterprise.com', source: 'whatsapp', status: 'contacted', attributes: { budget: '$100k', timeline: 'Q1 2026', company: 'Enterprise Corp' } },
    { id: 'lead-004', tenantId: 'tenant-001', botId: 'ws-001', name: 'Maria Santos', phone: '+55-11-99999-0001', email: 'maria@loja.com.br', source: 'whatsapp', status: 'converted', attributes: { budget: '$25k', plan: 'Pro' } },
    { id: 'lead-005', tenantId: 'tenant-001', botId: 'ws-002', name: 'Alex Johnson', phone: '+1-555-0105', email: 'alex@customer.com', source: 'whatsapp', status: 'new', attributes: { issue: 'billing' } },
    { id: 'lead-006', tenantId: 'tenant-001', botId: 'ws-002', name: 'Priya Patel', phone: '+91-98765-43210', email: 'priya@support.in', source: 'whatsapp', status: 'contacted', attributes: { issue: 'technical', product: 'Widget Pro' } },
    { id: 'lead-007', tenantId: 'tenant-001', botId: 'ws-003', name: 'David Kim', phone: '+82-10-1234-5678', email: 'david@seoul.kr', source: 'whatsapp', status: 'qualified', attributes: { budget: '$75k', score: 8 } },
    { id: 'lead-008', tenantId: 'tenant-001', botId: 'ws-001', name: 'Sophie Martin', phone: '+33-6-1234-5678', email: 'sophie@paris.fr', source: 'whatsapp', status: 'new', attributes: { budget: '€30k', timeline: 'Q4 2026' } },
    { id: 'lead-009', tenantId: 'tenant-001', botId: 'ws-004', name: 'Lisa Park', phone: '+82-10-9876-5432', email: 'lisa@booking.kr', source: 'whatsapp', status: 'new', attributes: { service: 'consultation' } },
    { id: 'lead-010', tenantId: 'tenant-001', botId: 'ws-001', name: 'Omar Hassan', phone: '+20-100-123-4567', email: 'omar@cairo.eg', source: 'whatsapp', status: 'converted', attributes: { budget: '$40k', plan: 'Enterprise' } },
    { id: 'lead-011', tenantId: 'tenant-001', botId: 'ws-002', name: 'Raj Sharma', phone: '+91-99887-76655', email: 'raj@delhi.in', source: 'whatsapp', status: 'new', attributes: {} },
    { id: 'lead-012', tenantId: 'tenant-001', botId: 'ws-001', name: 'Anna Mueller', phone: '+49-170-1234567', email: 'anna@berlin.de', source: 'whatsapp', status: 'contacted', attributes: { budget: '€20k' } },
    { id: 'lead-013', tenantId: 'tenant-001', botId: 'ws-003', name: 'Jake Brown', phone: '+1-555-0113', email: 'jake@usclient.com', source: 'website', status: 'qualified', attributes: { score: 7 } },
    { id: 'lead-014', tenantId: 'tenant-001', botId: 'ws-002', name: 'Chen Wei', phone: '+86-138-0000-1234', email: 'chen@beijing.cn', source: 'whatsapp', status: 'contacted', attributes: { issue: 'shipping' } },
    { id: 'lead-015', tenantId: 'tenant-001', botId: 'ws-001', name: 'Fatima Al-Rashid', phone: '+971-50-123-4567', email: 'fatima@dubai.ae', source: 'whatsapp', status: 'new', attributes: { budget: '$60k' } },
    { id: 'lead-016', tenantId: 'tenant-002', botId: 'ws-006', name: 'Tom Anderson', phone: '+44-7700-900000', email: 'tom@ukclient.co.uk', source: 'website', status: 'new', attributes: {} },
    { id: 'lead-017', tenantId: 'tenant-002', botId: 'ws-006', name: 'Nina Kowalski', phone: '+48-500-100-200', email: 'nina@warsaw.pl', source: 'whatsapp', status: 'contacted', attributes: {} },
    { id: 'lead-018', tenantId: 'tenant-003', botId: 'ws-007', name: 'Yuki Tanaka', phone: '+81-90-1234-5678', email: 'yuki@tokyo.jp', source: 'referral', status: 'contacted', attributes: { interest: 'bulk order' } },
    { id: 'lead-019', tenantId: 'tenant-003', botId: 'ws-007', name: 'Pedro Gomez', phone: '+52-55-1234-5678', email: 'pedro@mexico.mx', source: 'whatsapp', status: 'new', attributes: {} },
    { id: 'lead-020', tenantId: 'tenant-001', botId: 'ws-001', name: 'Rachel Green', phone: '+1-555-0120', email: 'rachel@nyc.com', source: 'whatsapp', status: 'qualified', attributes: { budget: '$35k', timeline: 'Q2 2026' } },
  ];

  for (const lead of leadData) {
    await prisma.lead.upsert({
      where: { id: lead.id },
      update: {},
      create: lead,
    });
  }
  console.log(`  Leads: ${leadData.length}`);

  // ── Conversations ────────────────────────────────────────────────────────
  const convData = [
    { id: 'conv-001', tenantId: 'tenant-001', leadId: 'lead-001', platform: 'whatsapp', externalUserId: '5511999990001@s.whatsapp.net', status: 'open' },
    { id: 'conv-002', tenantId: 'tenant-001', leadId: 'lead-002', platform: 'whatsapp', externalUserId: '15551021234@s.whatsapp.net', status: 'open' },
    { id: 'conv-003', tenantId: 'tenant-001', leadId: 'lead-003', platform: 'whatsapp', externalUserId: '15551034567@s.whatsapp.net', status: 'open' },
    { id: 'conv-004', tenantId: 'tenant-001', leadId: 'lead-004', platform: 'whatsapp', externalUserId: '5511999990002@s.whatsapp.net', status: 'closed' },
    { id: 'conv-005', tenantId: 'tenant-001', leadId: 'lead-005', platform: 'whatsapp', externalUserId: '15551057890@s.whatsapp.net', status: 'open' },
    { id: 'conv-006', tenantId: 'tenant-001', leadId: 'lead-006', platform: 'whatsapp', externalUserId: '919876543210@s.whatsapp.net', status: 'open' },
    { id: 'conv-007', tenantId: 'tenant-001', leadId: 'lead-007', platform: 'whatsapp', externalUserId: '821012345678@s.whatsapp.net', status: 'open' },
    { id: 'conv-008', tenantId: 'tenant-001', leadId: 'lead-008', platform: 'whatsapp', externalUserId: '33612345678@s.whatsapp.net', status: 'open' },
    { id: 'conv-009', tenantId: 'tenant-001', leadId: 'lead-010', platform: 'whatsapp', externalUserId: '201001234567@s.whatsapp.net', status: 'closed' },
    { id: 'conv-010', tenantId: 'tenant-001', leadId: 'lead-009', platform: 'whatsapp', externalUserId: '821098765432@s.whatsapp.net', status: 'open' },
    { id: 'conv-011', tenantId: 'tenant-001', leadId: 'lead-011', platform: 'whatsapp', externalUserId: '919988776655@s.whatsapp.net', status: 'open' },
    { id: 'conv-012', tenantId: 'tenant-001', leadId: 'lead-012', platform: 'whatsapp', externalUserId: '491701234567@s.whatsapp.net', status: 'open' },
    { id: 'conv-013', tenantId: 'tenant-001', leadId: 'lead-014', platform: 'whatsapp', externalUserId: '8613800001234@s.whatsapp.net', status: 'open' },
    { id: 'conv-014', tenantId: 'tenant-001', leadId: 'lead-015', platform: 'whatsapp', externalUserId: '971501234567@s.whatsapp.net', status: 'open' },
    { id: 'conv-015', tenantId: 'tenant-001', leadId: 'lead-020', platform: 'whatsapp', externalUserId: '15550120120@s.whatsapp.net', status: 'open' },
    { id: 'conv-016', tenantId: 'tenant-002', leadId: 'lead-016', platform: 'whatsapp', externalUserId: '447700900000@s.whatsapp.net', status: 'open' },
    { id: 'conv-017', tenantId: 'tenant-003', leadId: 'lead-018', platform: 'whatsapp', externalUserId: '819012345678@s.whatsapp.net', status: 'open' },
  ];

  for (const conv of convData) {
    await prisma.conversation.upsert({
      where: { id: conv.id },
      update: {},
      create: conv,
    });
  }
  console.log(`  Conversations: ${convData.length}`);

  // ── Messages ─────────────────────────────────────────────────────────────
  const msgData = [
    // Conv 1: Carlos Ramirez - Sales
    { convId: 'conv-001', dir: 'in', content: 'Hi, I saw your ad about the enterprise plan. Can you tell me more?', ts: '2026-03-15T10:30:00Z' },
    { convId: 'conv-001', dir: 'out', content: 'Hello Carlos! Our Enterprise plan includes unlimited API access, priority support, and custom integrations. Would you like to schedule a demo?', ts: '2026-03-15T10:31:00Z' },
    { convId: 'conv-001', dir: 'in', content: 'That sounds great. What is the pricing?', ts: '2026-03-15T10:35:00Z' },
    { convId: 'conv-001', dir: 'out', content: 'Enterprise starts at $499/month for up to 50 users. For ~200 users we can offer a custom quote.', ts: '2026-03-15T10:36:00Z' },
    { convId: 'conv-001', dir: 'in', content: 'Yes please. My budget is around $50k for the year.', ts: '2026-03-15T10:40:00Z' },
    { convId: 'conv-001', dir: 'out', content: 'I have scheduled a demo for next Tuesday at 2 PM EST. You will receive a calendar invite shortly.', ts: '2026-03-15T10:42:00Z' },
    { convId: 'conv-001', dir: 'in', content: 'Can you also show me the analytics dashboard?', ts: '2026-05-15T14:30:00Z' },
    { convId: 'conv-001', dir: 'out', content: 'Absolutely! We will cover analytics, reporting, and the AI features in the demo.', ts: '2026-05-15T14:32:00Z' },

    // Conv 2: Emily Chen - Startup
    { convId: 'conv-002', dir: 'in', content: 'Hello! I am interested in your product for my startup.', ts: '2026-04-02T14:00:00Z' },
    { convId: 'conv-002', dir: 'out', content: 'Hi Emily! We love working with startups. What stage is your company at?', ts: '2026-04-02T14:01:00Z' },
    { convId: 'conv-002', dir: 'in', content: 'We are Series A, about 15 people. Need a CRM that scales.', ts: '2026-04-02T14:05:00Z' },
    { convId: 'conv-002', dir: 'out', content: 'Our Growth plan is perfect. Up to 25 seats, grows with you. Want a comparison sheet?', ts: '2026-04-02T14:06:00Z' },

    // Conv 3: James Wilson - Enterprise
    { convId: 'conv-003', dir: 'in', content: 'We need a solution for 500+ agents across 3 regions.', ts: '2026-02-20T09:15:00Z' },
    { convId: 'conv-003', dir: 'out', content: 'James, our Enterprise plan supports multi-region deployments with data residency. What regions?', ts: '2026-02-20T09:20:00Z' },
    { convId: 'conv-003', dir: 'in', content: 'US, EU, and APAC. GDPR compliance is critical.', ts: '2026-02-20T09:25:00Z' },
    { convId: 'conv-003', dir: 'out', content: 'Fully GDPR compliant with EU data centers in Frankfurt. ~$95k/year with volume discounts for 500 seats.', ts: '2026-02-20T09:30:00Z' },
    { convId: 'conv-003', dir: 'in', content: 'That is within our budget. Let us proceed with the proposal.', ts: '2026-05-08T16:30:00Z' },

    // Conv 4: Maria Santos - Converted
    { convId: 'conv-004', dir: 'in', content: 'Ola! Quero assinar o plano Pro.', ts: '2026-01-10T11:00:00Z' },
    { convId: 'conv-004', dir: 'out', content: 'Ola Maria! Vou te enviar o link de pagamento. O plano Pro inclui 10 usuarios.', ts: '2026-01-10T11:02:00Z' },
    { convId: 'conv-004', dir: 'in', content: 'Perfeito! Ja fiz o pagamento.', ts: '2026-01-10T11:30:00Z' },
    { convId: 'conv-004', dir: 'out', content: 'Pagamento confirmado! Bem-vinda ao Acme Corp Pro.', ts: '2026-01-10T11:32:00Z' },

    // Conv 5: Alex Johnson - Support
    { convId: 'conv-005', dir: 'in', content: 'I was charged twice on my last invoice. Can you help?', ts: '2026-05-01T08:00:00Z' },
    { convId: 'conv-005', dir: 'out', content: 'Sorry to hear that Alex. Can you provide your account email?', ts: '2026-05-01T08:01:00Z' },
    { convId: 'conv-005', dir: 'in', content: 'alex@customer.com. Invoice #INV-2026-0892.', ts: '2026-05-01T08:05:00Z' },
    { convId: 'conv-005', dir: 'out', content: 'Found it! Duplicate charge of $49.99. Refund initiated, 3-5 business days.', ts: '2026-05-01T08:10:00Z' },

    // Conv 6: Priya Patel - Technical
    { convId: 'conv-006', dir: 'in', content: 'Widget Pro not syncing. Error E-4021.', ts: '2026-04-15T13:00:00Z' },
    { convId: 'conv-006', dir: 'out', content: 'E-4021 usually means API version mismatch. Check firmware: Settings > About.', ts: '2026-04-15T13:05:00Z' },
    { convId: 'conv-006', dir: 'in', content: 'It says v2.3.1. Is that old?', ts: '2026-04-15T13:10:00Z' },
    { convId: 'conv-006', dir: 'out', content: 'Yes, current is v2.5.0. Update via Settings > Firmware > Check for Updates.', ts: '2026-04-15T13:12:00Z' },
    { convId: 'conv-006', dir: 'in', content: 'Updated and it works! Thank you!', ts: '2026-05-12T10:00:00Z' },

    // Conv 7: David Kim - Qualification
    { convId: 'conv-007', dir: 'in', content: 'Evaluating CRM for our Seoul office. What makes you different from Salesforce?', ts: '2026-03-28T10:00:00Z' },
    { convId: 'conv-007', dir: 'out', content: '1) AI-native lead qualification, 2) Native WhatsApp integration, 3) 60% less than Salesforce. Team size?', ts: '2026-03-28T10:05:00Z' },
    { convId: 'conv-007', dir: 'in', content: 'About 50 people. Budget $75k. Timeline Q3.', ts: '2026-03-28T10:10:00Z' },
    { convId: 'conv-007', dir: 'out', content: 'Perfect fit for Business plan. Lead score: 8/10. Korean-language demo?', ts: '2026-03-28T10:15:00Z' },
    { convId: 'conv-007', dir: 'in', content: 'Yes, next week works.', ts: '2026-05-05T15:30:00Z' },

    // Conv 8: Sophie Martin
    { convId: 'conv-008', dir: 'in', content: 'Bonjour! Je cherche un CRM pour mon entreprise a Paris.', ts: '2026-05-10T16:00:00Z' },
    { convId: 'conv-008', dir: 'out', content: 'Bonjour Sophie! We have a Paris data center for GDPR. Company size?', ts: '2026-05-10T16:05:00Z' },

    // Conv 10: Lisa Park - Appointment
    { convId: 'conv-010', dir: 'in', content: 'Hi, I would like to book a consultation for next week.', ts: '2026-05-15T14:00:00Z' },
    { convId: 'conv-010', dir: 'out', content: 'We have Monday 2-4 PM, Wednesday 10 AM-12 PM, Friday 3-5 PM. Which works?', ts: '2026-05-15T14:05:00Z' },
    { convId: 'conv-010', dir: 'in', content: 'Wednesday at 10 AM please.', ts: '2026-05-15T14:10:00Z' },
    { convId: 'conv-010', dir: 'out', content: 'Booked! Wednesday May 21 at 10:00 AM. Reminder 1 hour before.', ts: '2026-05-15T14:15:00Z' },

    // Conv 11: Raj Sharma
    { convId: 'conv-011', dir: 'in', content: 'Do you have an API for custom integrations?', ts: '2026-05-10T09:00:00Z' },
    { convId: 'conv-011', dir: 'out', content: 'Yes! REST API with full CRUD access. Docs at docs.acmecorp.com/api.', ts: '2026-05-10T09:05:00Z' },

    // Conv 12: Anna Mueller
    { convId: 'conv-012', dir: 'in', content: 'Wie viel kostet der Pro-Plan?', ts: '2026-05-08T11:00:00Z' },
    { convId: 'conv-012', dir: 'out', content: 'The Pro plan is $99/month for up to 10 users. We also have annual discounts.', ts: '2026-05-08T11:05:00Z' },

    // Conv 13: Chen Wei
    { convId: 'conv-013', dir: 'in', content: 'My order has not arrived yet. Order #ORD-2026-4521.', ts: '2026-05-12T07:00:00Z' },
    { convId: 'conv-013', dir: 'out', content: 'Let me track that for you. It shows in transit, estimated delivery May 16.', ts: '2026-05-12T07:05:00Z' },

    // Conv 14: Fatima Al-Rashid
    { convId: 'conv-014', dir: 'in', content: 'Looking for a CRM for our Dubai office. 50 users.', ts: '2026-05-14T10:00:00Z' },
    { convId: 'conv-014', dir: 'out', content: 'We serve the Middle East region. Pro plan at $99/mo or Enterprise for custom needs.', ts: '2026-05-14T10:05:00Z' },

    // Conv 15: Rachel Green
    { convId: 'conv-015', dir: 'in', content: 'Hi! I want to upgrade from Free to Pro.', ts: '2026-05-16T09:00:00Z' },
    { convId: 'conv-015', dir: 'out', content: 'Great choice Rachel! I will send you the upgrade link. Pro includes 10 seats and priority support.', ts: '2026-05-16T09:02:00Z' },
    { convId: 'conv-015', dir: 'in', content: 'Perfect, budget is $35k for the year. Can we get a discount?', ts: '2026-05-16T09:05:00Z' },
    { convId: 'conv-015', dir: 'out', content: 'For annual billing we offer 20% off. That brings it to $950/year. Want me to set that up?', ts: '2026-05-16T09:10:00Z' },
  ];

  for (let i = 0; i < msgData.length; i++) {
    const m = msgData[i];
    await prisma.message.create({
      data: {
        id: `msg-${String(i + 1).padStart(3, '0')}`,
        tenantId: 'tenant-001',
        conversationId: m.convId,
        direction: m.dir,
        content: m.content,
        messageType: 'text',
        platformMessageId: `wa-seed-${i + 1}`,
        createdAt: new Date(m.ts),
      },
    });
  }
  console.log(`  Messages: ${msgData.length}`);

  // ── Workflows ────────────────────────────────────────────────────────────
  const wfData = [
    {
      id: 'wf-001', tenantId: 'tenant-001', name: 'Lead Qualification Flow', triggerIntent: 'new_lead',
      steps: [
        { key: 'greeting', prompt: 'Welcome! What is your name?' },
        { key: 'company', prompt: 'What company are you with?' },
        { key: 'budget', prompt: 'What is your budget range?' },
        { key: 'timeline', prompt: 'When are you looking to start?' },
        { key: 'score', prompt: 'Based on your answers, here is your lead score.' },
      ],
    },
    {
      id: 'wf-002', tenantId: 'tenant-001', name: 'Customer Onboarding', triggerIntent: 'signup',
      steps: [
        { key: 'welcome', prompt: 'Welcome to Acme! Let us get you started.' },
        { key: 'profile', prompt: 'Tell us about your business.' },
        { key: 'setup', prompt: 'Let me help you configure your workspace.' },
        { key: 'training', prompt: 'Would you like a quick tutorial?' },
      ],
    },
    {
      id: 'wf-003', tenantId: 'tenant-001', name: 'Support Ticket Flow', triggerIntent: 'support',
      steps: [
        { key: 'issue', prompt: 'What issue are you experiencing?' },
        { key: 'priority', prompt: 'How urgent is this? (Low/Medium/High)' },
        { key: 'details', prompt: 'Can you provide more details?' },
      ],
    },
    {
      id: 'wf-004', tenantId: 'tenant-001', name: 'Feedback Collection', triggerIntent: 'feedback',
      steps: [
        { key: 'rating', prompt: 'How would you rate your experience? (1-5)' },
        { key: 'comments', prompt: 'Any additional comments?' },
      ],
    },
  ];

  for (const wf of wfData) {
    await prisma.workflow.upsert({
      where: { id: wf.id },
      update: {},
      create: wf,
    });
  }
  console.log(`  Workflows: ${wfData.length}`);

  // ── Workflow Executions ──────────────────────────────────────────────────
  const wfeData = [
    { id: 'wfe-001', tenantId: 'tenant-001', workflowId: 'wf-001', leadId: 'lead-002', currentStepIndex: 2, status: 'active', collectedData: { greeting: 'Emily Chen', company: 'StartupCo' } },
    { id: 'wfe-002', tenantId: 'tenant-001', workflowId: 'wf-001', leadId: 'lead-007', currentStepIndex: 5, status: 'completed', collectedData: { greeting: 'David Kim', company: 'SeoulTech', budget: '$75k', timeline: 'Q3 2026', score: 8 } },
    { id: 'wfe-003', tenantId: 'tenant-001', workflowId: 'wf-002', leadId: 'lead-004', currentStepIndex: 4, status: 'completed', collectedData: { welcome: 'Maria Santos', profile: 'E-commerce', setup: 'Done', training: 'Yes' } },
    { id: 'wfe-004', tenantId: 'tenant-001', workflowId: 'wf-003', leadId: 'lead-005', currentStepIndex: 1, status: 'active', collectedData: { issue: 'Double charge' } },
    { id: 'wfe-005', tenantId: 'tenant-001', workflowId: 'wf-003', leadId: 'lead-006', currentStepIndex: 3, status: 'completed', collectedData: { issue: 'Widget Pro sync error', priority: 'Medium', details: 'Error E-4021' } },
    { id: 'wfe-006', tenantId: 'tenant-001', workflowId: 'wf-004', leadId: 'lead-001', currentStepIndex: 2, status: 'completed', collectedData: { rating: '5', comments: 'Great service!' } },
    { id: 'wfe-007', tenantId: 'tenant-001', workflowId: 'wf-001', leadId: 'lead-013', currentStepIndex: 5, status: 'completed', collectedData: { greeting: 'Jake Brown', company: 'US Client LLC', budget: '$20k', timeline: 'Q2 2026', score: 7 } },
    { id: 'wfe-008', tenantId: 'tenant-001', workflowId: 'wf-001', leadId: 'lead-020', currentStepIndex: 3, status: 'active', collectedData: { greeting: 'Rachel Green', company: 'NYC Corp', budget: '$35k' } },
  ];

  for (const wfe of wfeData) {
    await prisma.workflowExecution.upsert({
      where: { id: wfe.id },
      update: {},
      create: wfe,
    });
  }
  console.log(`  Workflow Executions: ${wfeData.length}`);

  // ── API Keys ─────────────────────────────────────────────────────────────
  await prisma.apiKey.upsert({
    where: { id: 'apikey-001' },
    update: {},
    create: { id: 'apikey-001', tenantId: 'tenant-001', keyHash: '$2b$10$mockhash1234567890abcdefghijklmnop', name: 'Default API Key' },
  });
  console.log('  API Keys: 1');

  // ── Events ───────────────────────────────────────────────────────────────
  const eventData = [
    { type: 'bot.created', payload: { botId: 'ws-001', name: 'Sales Assistant (US)' }, ts: '2026-02-10T10:00:00Z' },
    { type: 'bot.connected', payload: { botId: 'ws-001' }, ts: '2026-02-10T10:05:00Z' },
    { type: 'lead.created', payload: { leadId: 'lead-001', name: 'Carlos Ramirez' }, ts: '2026-03-15T10:30:00Z' },
    { type: 'lead.qualified', payload: { leadId: 'lead-001', score: 9 }, ts: '2026-03-15T10:42:00Z' },
    { type: 'lead.converted', payload: { leadId: 'lead-004', plan: 'Pro' }, ts: '2026-01-10T11:32:00Z' },
    { type: 'workflow.completed', payload: { workflowId: 'wf-001', executionId: 'wfe-002' }, ts: '2026-03-28T10:30:00Z' },
    { type: 'message.received', payload: { leadId: 'lead-005' }, ts: '2026-05-01T08:00:00Z' },
    { type: 'bot.created', payload: { botId: 'ws-002', name: 'Customer Support Bot' }, ts: '2026-03-05T08:30:00Z' },
    { type: 'bot.stopped', payload: { botId: 'ws-003' }, ts: '2026-05-10T09:00:00Z' },
    { type: 'appointment.booked', payload: { leadId: 'lead-009', date: '2026-05-21T10:00:00Z' }, ts: '2026-05-15T14:15:00Z' },
  ];

  for (const evt of eventData) {
    await prisma.event.create({
      data: {
        tenantId: 'tenant-001',
        type: evt.type,
        payload: evt.payload,
        createdAt: new Date(evt.ts),
      },
    });
  }
  console.log(`  Events: ${eventData.length}`);

  // ── Billing Usage ────────────────────────────────────────────────────────
  const billingData = [
    { metric: 'messages_sent', quantity: 15420, periodStart: '2026-04-01', periodEnd: '2026-04-30' },
    { metric: 'messages_sent', quantity: 8230, periodStart: '2026-05-01', periodEnd: '2026-05-31' },
    { metric: 'ai_tokens', quantity: 2450000, periodStart: '2026-04-01', periodEnd: '2026-04-30' },
    { metric: 'ai_tokens', quantity: 1100000, periodStart: '2026-05-01', periodEnd: '2026-05-31' },
    { metric: 'api_calls', quantity: 89200, periodStart: '2026-04-01', periodEnd: '2026-04-30' },
    { metric: 'storage_mb', quantity: 2048, periodStart: '2026-05-01', periodEnd: '2026-05-31' },
  ];

  for (const bill of billingData) {
    await prisma.billingUsage.create({
      data: {
        tenantId: 'tenant-001',
        metric: bill.metric,
        quantity: BigInt(bill.quantity),
        periodStart: new Date(bill.periodStart),
        periodEnd: new Date(bill.periodEnd),
      },
    });
  }
  console.log(`  Billing Usage: ${billingData.length}`);

  // ── AI Logs ──────────────────────────────────────────────────────────────
  const aiLogData = [
    { model: 'llama-3-70b', promptTokens: 1200, completionTokens: 450, cost: 0.0023, ts: '2026-05-15T10:00:00Z' },
    { model: 'llama-3-70b', promptTokens: 800, completionTokens: 320, cost: 0.0015, ts: '2026-05-15T11:00:00Z' },
    { model: 'gpt-4o', promptTokens: 2000, completionTokens: 800, cost: 0.04, ts: '2026-05-14T14:00:00Z' },
    { model: 'llama-3-70b', promptTokens: 1500, completionTokens: 600, cost: 0.0029, ts: '2026-05-14T16:00:00Z' },
    { model: 'llama-3-70b', promptTokens: 900, completionTokens: 350, cost: 0.0017, ts: '2026-05-13T09:00:00Z' },
    { model: 'gpt-4o', promptTokens: 3000, completionTokens: 1200, cost: 0.06, ts: '2026-05-13T12:00:00Z' },
    { model: 'llama-3-70b', promptTokens: 1100, completionTokens: 420, cost: 0.0021, ts: '2026-05-12T15:00:00Z' },
  ];

  for (const log of aiLogData) {
    await prisma.aiLog.create({
      data: {
        tenantId: 'tenant-001',
        model: log.model,
        promptTokens: log.promptTokens,
        completionTokens: log.completionTokens,
        cost: log.cost,
        createdAt: new Date(log.ts),
      },
    });
  }
  console.log(`  AI Logs: ${aiLogData.length}`);

  console.log('\nSeed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
