import fetch from 'node-fetch';

const url = "https://mkrfoodsbackend.onrender.com/api/payment/create";

console.log(`[DEBUG] Targeting URL: ${url}`);

const payload = {
    amount: 500, // 500 INR
    name: "Debug User",
    email: "debug@example.com",
    phone: "9999999999",
    userId: "debug_user_123"
};

try {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token_for_fallback_check' 
        },
        body: JSON.stringify(payload)
    });

    console.log(`[DEBUG] Response Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log(`[DEBUG] Response Body: ${text}`);

} catch (error) {
    console.error("[DEBUG] Network Error:", error.message);
}
