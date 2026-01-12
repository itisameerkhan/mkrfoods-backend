// Test script for OTP email system
import axios from 'axios';

const testOtp = async () => {
    try {
        console.log('🔄 Testing OTP Send Endpoint...');
        console.log('📧 Sending OTP to: itisameerkhan@gmail.com\n');

        // Test sending OTP
        const sendResponse = await axios.post('http://localhost:8080/api/email-otp/send', {
            email: 'itisameerkhan@gmail.com'
        });

        console.log('✅ OTP Send Response:');
        console.log(JSON.stringify(sendResponse.data, null, 2));

        if (sendResponse.data.success) {
            console.log('\n✅ OTP sent successfully!');
            console.log('📧 Email:', sendResponse.data.email);
            console.log('⏱️  Check your email for the OTP code (expires in 5 minutes)');
        }

    } catch (error) {
        console.error('\n❌ Error Details:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
};

testOtp();
