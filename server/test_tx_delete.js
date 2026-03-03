const axios = require('axios');
const API_URL = 'http://localhost:5001/api';
const txId = 'DE5957FE-CE48-4C95-8A94-0E6CC6CB989C';

async function testDelete() {
    try {
        console.log(`Testing DELETE /api/transactions/${txId}`);
        const res = await axios.delete(`${API_URL}/transactions/${txId}`);
        console.log('Response:', res.data);
    } catch (err) {
        console.log('Error Status:', err.response?.status);
        console.log('Error Data:', err.response?.data);
        console.log('Error Message:', err.message);
    }
}

testDelete();
