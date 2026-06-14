import { WhatsAppAdapter } from './src/adapters/whatsapp.adapter';
WhatsAppAdapter.sendMessage('whatsapp_1781400152112_3hmn', '123456@s.whatsapp.net', 'test').then(console.log).catch(e => console.error(JSON.stringify(e?.response?.data || e.message, null, 2)));
