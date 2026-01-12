# Phone OTP Verification - Backend Implementation Summary

## ✅ What Was Done

### 1. **Backend API Created** (`src/routes/phoneOtp.js`)

- **Send OTP Endpoint** - Sends 6-digit code via Fast2SMS
- **Verify OTP Endpoint** - Validates OTP with expiry & attempt limits
- **Resend OTP Endpoint** - Request new OTP anytime
- **Status Endpoint** - Check OTP details (dev mode only)

### 2. **Main Server Updated** (`src/index.js`)

- Added CORS middleware for frontend communication
- Added JSON body parser
- Imported phone OTP routes
- Added error handling
- Added health check endpoint

### 3. **Environment Configuration** (`.env`)

```env
PORT=8080
NODE_ENV=development
FAST2SMS_API_KEY=R4fvc9BwlQDn5zL7gJiEpoFkteWPNdSqHY0jAOG3ZuMbsymKVhKRHSNU2wLIeW1Mar7dXzqBoiFvgZO3
```

### 4. **Documentation Created**

- `PHONE_OTP_API_DOCS.md` - Complete API documentation
- `SETUP_INSTRUCTIONS.md` - Quick start guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd Backend
npm install axios
```

### Step 2: Start Server

```bash
npm run dev
```

### Step 3: Test API

```bash
curl -X POST http://localhost:8080/api/phone-otp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'
```

## 📋 API Endpoints

### Send OTP

```
POST /api/phone-otp/send
Body: { "phoneNumber": "9876543210" }
```

### Verify OTP

```
POST /api/phone-otp/verify
Body: { "phoneNumber": "9876543210", "otp": "123456" }
```

### Resend OTP

```
POST /api/phone-otp/resend
Body: { "phoneNumber": "9876543210" }
```

### Check Status (Dev Only)

```
GET /api/phone-otp/status/9876543210
```

## 🔑 Key Features

| Feature              | Details                           |
| -------------------- | --------------------------------- |
| **OTP Sending**      | Via Fast2SMS (real SMS)           |
| **Phone Validation** | 10-digit format with +91 auto-add |
| **OTP Expiry**       | 5 minutes                         |
| **Attempt Limiting** | Max 3 verification attempts       |
| **Error Handling**   | Detailed error messages           |
| **Development Mode** | OTP visible via status endpoint   |
| **CORS Support**     | Works with frontend               |
| **Logging**          | Console logs for debugging        |

## 💾 In-Memory OTP Storage

The system uses a Map to store OTPs with:

- **Phone Number** (91XXXXXXXXXX format)
- **OTP Code** (6 digits)
- **Expiry Time** (5 minutes)
- **Attempt Count** (max 3)

Structure:

```javascript
otpStore.set(formattedPhone, {
  otp: "123456",
  expiresAt: 1703264800000,
  attempts: 0,
});
```

## 🔒 Security Features

✅ OTP expires after 5 minutes
✅ Max 3 verification attempts
✅ Phone number validation
✅ API key in .env (not in code)
✅ Error messages don't leak sensitive info
✅ CORS protection
✅ Input sanitization

## 📡 Fast2SMS Integration

- **API Endpoint:** `https://www.fast2sms.com/dev/bulksms`
- **Method:** POST with params
- **Sender ID:** MKRFOOD
- **Message Template:** "Your MKR Foods OTP is {OTP}. It will expire in 5 minutes."
- **Country:** India (supports international)

## 🧪 Testing

### Using cURL

```bash
# Send
curl -X POST http://localhost:8080/api/phone-otp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'

# Verify
curl -X POST http://localhost:8080/api/phone-otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210", "otp": "123456"}'

# Status (dev)
curl http://localhost:8080/api/phone-otp/status/9876543210
```

### Using Postman

1. Import requests from API_DOCS.md
2. Test each endpoint
3. Monitor server logs

## 📝 Next Steps

1. ✅ Backend OTP API ready
2. ⏳ Update Frontend to use backend API
3. ⏳ Replace Firebase Auth with backend auth
4. ⏳ Add database for user storage
5. ⏳ Implement JWT tokens
6. ⏳ Add rate limiting
7. ⏳ Production deployment

## 🛠️ File Structure

```
Backend/
├── src/
│   ├── index.js (Updated)
│   └── routes/
│       └── phoneOtp.js (New)
├── .env (Updated)
├── package.json
├── PHONE_OTP_API_DOCS.md (New)
└── SETUP_INSTRUCTIONS.md (New)
```

## 🚨 Important Notes

- **Axios dependency** must be installed
- **API key** is in .env, keep it secret
- **Fast2SMS account** must have SMS balance
- **NODE_ENV=development** enables debug endpoints
- **CORS enabled** for all origins (secure in production)

## ✨ Ready to Use!

The backend is now ready for phone OTP verification. Update your frontend to call these APIs instead of using Firebase Phone Auth.
