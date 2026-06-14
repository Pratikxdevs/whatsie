import axios from 'axios';
import { PrismaClient } from '@prisma/client';

async function testSend() {
  try {
    const res = await axios.post('http://localhost:8081/message/sendText/whatsapp_1781407365656_p3b0', {
      number: '918178570895',
      text: 'Test script'
    }, {
      headers: {
        'apikey': '429683C4C977415CAAFCCE10F7D57E11'
      }
    });
    console.log('Success:', res.data);
  } catch (err: any) {
    console.log('Error data:', err.response?.data);
  }
}

testSend();
