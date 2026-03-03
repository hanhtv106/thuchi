const axios = require('axios');
const API_URL = 'http://localhost:5001/api';

async function testAddWithAttachment() {
    try {
        console.log('Testing POST /api/transactions with attachment');
        const tx = {
            date: new Date().toISOString(),
            type: 'income',
            amount: 1000000,
            content: 'Test attachment',
            categoryId: 'CAT_TEST',
            unitId: 'UNT_TEST',
            partnerId: 'PAR_TEST',
            quantity: 1,
            unitPrice: 1000000,
            receiver: 'Antigravity',
            attachments: [
                { name: 'test.txt', type: 'text/plain', data: 'data:text/plain;base64,SGVsbG8gd29ybGQ=' }
            ],
            createdBy: '00000000-0000-0000-0000-000000000000' // Placeholder
        };
        const res = await axios.post(`${API_URL}/transactions`, tx);
        console.log('Response:', res.data);
    } catch (err) {
        console.log('Error Status:', err.response?.status);
        console.log('Error Data:', err.response?.data);
        console.log('Error Message:', err.message);
    }
}

testAddWithAttachment();
