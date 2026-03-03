const axios = require('axios');
const API_URL = 'http://localhost:5001/api';

async function testDelete() {
    try {
        console.log('Testing DELETE /api/categories/NON_EXISTENT');
        const res = await axios.delete(`${API_URL}/categories/NON_EXISTENT`);
        console.log('Response:', res.data);
    } catch (err) {
        console.log('Error Status:', err.response?.status);
        console.log('Error Data:', err.response?.data);
    }
}

testDelete();
