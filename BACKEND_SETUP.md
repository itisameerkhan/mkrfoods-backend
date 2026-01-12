# Backend Setup Instructions

## Environment Configuration

### 1. Environment Variables

The `.env` file is not included in the repository for security reasons and contains sensitive credentials.

**To set up the backend locally:**

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Update the values in `.env` with your actual credentials:

   ```
   PORT=8080
   NODE_ENV=development

   # Gmail Configuration
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-specific-password

   # Add other credentials as needed
   ```

## Getting Required Credentials

### Gmail App Password

1. Enable 2-Factor Authentication on your Google Account
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Create an App Password for Gmail
4. Use this generated password in the `EMAIL_PASS` field

### Other Services

- Update other API keys and credentials as needed for your environment

## Installation & Running

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```
   Or with nodemon for development:
   ```bash
   npm run dev
   ```

## Important Notes

- **Never commit the `.env` file** - it contains sensitive credentials
- The `.env` file is automatically ignored by Git (.gitignore)
- Always use `.env.example` as a template for configuration
- If you accidentally commit sensitive credentials, immediately regenerate them in the respective services (Gmail, API providers, etc.)

## API Endpoints

- Health Check: `GET /health`
- Root: `GET /`
- Email OTP: `POST /api/email-otp`
- Mobile OTP: `POST /api/mobile-otp`
- Signup OTP: `POST /api/signup-otp`

Refer to `PHONE_OTP_API_DOCS.md` for detailed API documentation.
