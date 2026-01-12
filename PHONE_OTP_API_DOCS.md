# Phone OTP Verification API Documentation

## Installation

First, install axios package:

```bash
npm install axios
```

## Environment Variables

Add to `.env` file:

```env
PORT=8080
NODE_ENV=development
FAST2SMS_API_KEY=R4fvc9BwlQDn5zL7gJiEpoFkteWPNdSqHY0jAOG3ZuMbsymKVhKRHSNU2wLIeW1Mar7dXzqBoiFvgZO3
```

## API Endpoints

### 1. Send OTP

**Endpoint:** `POST /api/phone-otp/send`

**Description:** Sends a 6-digit OTP to the provided phone number via Fast2SMS

**Request Body:**

```json
{
  "phoneNumber": "9876543210"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "919876543210"
}
```

**Response (Error):**

```json
{
  "success": false,
  "message": "Phone number must be 10 digits"
}
```

**Error Cases:**

- Invalid phone number format
- Phone number not 10 digits
- Fast2SMS API failure
- Missing phone number

---

### 2. Verify OTP

**Endpoint:** `POST /api/phone-otp/verify`

**Description:** Verifies the OTP sent to the phone number

**Request Body:**

```json
{
  "phoneNumber": "9876543210",
  "otp": "123456"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "phone": "919876543210",
  "verified": true
}
```

**Response (Error):**

```json
{
  "success": false,
  "message": "Invalid OTP. Attempts remaining: 2",
  "attemptsRemaining": 2
}
```

**Error Cases:**

- OTP not found (not requested yet)
- OTP expired (after 5 minutes)
- Invalid OTP (max 3 attempts)
- Missing parameters

**Rules:**

- OTP valid for 5 minutes
- Maximum 3 verification attempts
- After 3 failed attempts, must request new OTP

---

### 3. Resend OTP

**Endpoint:** `POST /api/phone-otp/resend`

**Description:** Resends OTP to the phone number (clears previous OTP)

**Request Body:**

```json
{
  "phoneNumber": "9876543210"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phone": "919876543210"
}
```

---

### 4. Check OTP Status (Development Only)

**Endpoint:** `GET /api/phone-otp/status/:phone`

**Description:** Check OTP details for debugging (only in development mode)

**Example:** `GET /api/phone-otp/status/9876543210`

**Response (Success):**

```json
{
  "success": true,
  "phone": "919876543210",
  "otp": "123456",
  "expiresIn": "245s",
  "attempts": 0
}
```

---

## Frontend Integration

### Using Fetch API

```javascript
// Send OTP
const sendOtp = async (phoneNumber) => {
  try {
    const response = await fetch("http://localhost:8080/api/phone-otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await response.json();
    if (data.success) {
      console.log("OTP sent to:", data.phone);
    } else {
      console.error("Error:", data.message);
    }
  } catch (error) {
    console.error("Failed to send OTP:", error);
  }
};

// Verify OTP
const verifyOtp = async (phoneNumber, otp) => {
  try {
    const response = await fetch("http://localhost:8080/api/phone-otp/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber, otp }),
    });
    const data = await response.json();
    if (data.success) {
      console.log("OTP verified successfully");
      // Proceed with authentication
    } else {
      console.error("Error:", data.message);
    }
  } catch (error) {
    console.error("Failed to verify OTP:", error);
  }
};

// Resend OTP
const resendOtp = async (phoneNumber) => {
  try {
    const response = await fetch("http://localhost:8080/api/phone-otp/resend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await response.json();
    if (data.success) {
      console.log("New OTP sent");
    } else {
      console.error("Error:", data.message);
    }
  } catch (error) {
    console.error("Failed to resend OTP:", error);
  }
};
```

### Using Axios

```javascript
import axios from "axios";

const API_URL = "http://localhost:8080/api/phone-otp";

// Send OTP
const sendOtp = async (phoneNumber) => {
  try {
    const response = await axios.post(`${API_URL}/send`, { phoneNumber });
    if (response.data.success) {
      console.log("OTP sent to:", response.data.phone);
    }
  } catch (error) {
    console.error("Error:", error.response.data.message);
  }
};

// Verify OTP
const verifyOtp = async (phoneNumber, otp) => {
  try {
    const response = await axios.post(`${API_URL}/verify`, {
      phoneNumber,
      otp,
    });
    if (response.data.success) {
      console.log("OTP verified successfully");
    }
  } catch (error) {
    console.error("Error:", error.response.data.message);
  }
};
```

---

## Features

✅ **Fast2SMS Integration** - Real SMS delivery to Indian phone numbers
✅ **OTP Generation** - Random 6-digit codes
✅ **Expiry Management** - 5-minute expiry time
✅ **Attempt Limiting** - Max 3 verification attempts
✅ **Phone Formatting** - Automatic +91 country code addition
✅ **Validation** - 10-digit phone number validation
✅ **Error Handling** - Detailed error messages
✅ **Development Mode** - OTP visible in status endpoint for testing
✅ **CORS Support** - Works with frontend applications
✅ **Resend Functionality** - Request new OTP anytime

---

## Testing

### Using cURL

```bash
# Send OTP
curl -X POST http://localhost:8080/api/phone-otp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'

# Verify OTP
curl -X POST http://localhost:8080/api/phone-otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210", "otp": "123456"}'

# Check OTP Status (dev mode)
curl http://localhost:8080/api/phone-otp/status/9876543210

# Resend OTP
curl -X POST http://localhost:8080/api/phone-otp/resend \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'
```

### Using Postman

1. Create new POST request to `http://localhost:8080/api/phone-otp/send`
2. Set Body as JSON:
   ```json
   {
     "phoneNumber": "9876543210"
   }
   ```
3. Send request
4. Use the returned phone number for verification

---

## Fast2SMS API Documentation

- **API Key:** R4fvc9BwlQDn5zL7gJiEpoFkteWPNdSqHY0jAOG3ZuMbsymKVhKRHSNU2wLIeW1Mar7dXzqBoiFvgZO3
- **Endpoint:** https://www.fast2sms.com/dev/bulksms
- **Documentation:** https://fast2sms.com/api/documentation
- **Supported Countries:** India and other countries
- **Delivery Time:** Usually within seconds

---

## Security Recommendations

1. **Add rate limiting** to prevent abuse
2. **Use HTTPS** in production
3. **Store verified phone numbers** in database
4. **Log all OTP attempts** for security audit
5. **Add IP-based rate limiting** for multiple requests
6. **Use database** instead of in-memory storage for production
7. **Add user authentication** before OTP verification
8. **Encrypt sensitive data** in logs

---

## Troubleshooting

### OTP Not Received

- Check internet connection
- Verify phone number format (10 digits)
- Check Fast2SMS API key is correct
- Check SMS balance in Fast2SMS account

### API Returns 500 Error

- Check if axios is installed (`npm install axios`)
- Check .env file for API key
- Check network connectivity
- Review server logs for detailed error

### CORS Error

- Ensure CORS middleware is enabled in index.js
- Check frontend is sending correct Content-Type header

### OTP Expired

- OTP expires after 5 minutes
- User must request new OTP within 5 minutes
- After 3 failed attempts, OTP is automatically deleted

---

## Files

- `src/index.js` - Main server file with middleware setup
- `src/routes/phoneOtp.js` - Phone OTP route handlers
- `.env` - Environment variables with API key
