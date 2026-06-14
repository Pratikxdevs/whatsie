const axios = require('axios');
axios.get('https://openrouter.ai/api/v1/auth/key', {
  headers: { Authorization: 'Bearer sk-or-v1-dummy' }
}).catch(err => {
  console.log(err.response?.status, err.response?.data);
});
