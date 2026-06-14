const axios = require('axios');
axios.get('https://openrouter.ai/api/v1/models', {
  headers: { Authorization: 'Bearer sk-or-v1-dummy' }
}).then(res => console.log('success models'))
  .catch(err => {
  console.log('models err:', err.response?.status, err.response?.data);
});
