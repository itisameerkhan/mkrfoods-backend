import fetch from 'node-fetch';

const url = "https://mkrfoodsbackend.onrender.com/health";

console.log(`Testing connection to: ${url}`);

try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`Response: ${text}`);
} catch (error) {
    console.error("Connection failed:", error.message);
}
