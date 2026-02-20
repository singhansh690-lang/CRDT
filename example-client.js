const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function runClient() {
    let connected = false;

    // Retry loop to allow server time to start
    for (let i = 0; i < 5; i++) {
        try {
            console.log(`Attempting to connect to ${API_URL}...`);
            await axios.get(`${API_URL}/gset`);
            connected = true;
            break;
        } catch (e) {
            console.log(`Connection failed, retrying in 1s...`);
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    if (!connected) {
        console.error('Could not connect to server after retries.');
        return;
    }

    try {
        console.log('Fetching initial GSets...');
        let res = await axios.get(`${API_URL}/gset`);
        console.log('Initial GSet:', res.data.values);

        console.log('Adding "hello" to GSet...');

        // Try aliased route first, fall back to param route
        try {
            await axios.post(`${API_URL}/gset`, { value: 'hello' });
        } catch (e) {
            await axios.post(`${API_URL}/add/hello`);
        }

        console.log('Fetching updated GSets...');
        res = await axios.get(`${API_URL}/gset`);
        console.log('Updated GSet:', res.data.values);

        console.log('Fetching Counter...');
        res = await axios.get(`${API_URL}/counter`);
        console.log('Initial Counter:', res.data.value);

        console.log('Incrementing Counter...');
        try {
            await axios.post(`${API_URL}/counter/inc`, { amount: 5 });
        } catch (e) {
            await axios.post(`${API_URL}/inc`);
        }

        console.log('Fetching updated Counter...');
        res = await axios.get(`${API_URL}/counter`);
        console.log('Updated Counter:', res.data.value);

    } catch (error) {
        console.error('Error fetching API:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

runClient();
