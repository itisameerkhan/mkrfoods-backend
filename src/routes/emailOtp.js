import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// In-memory OTP storage with expiration
const otpStore = new Map();

// Email configuration (read from environment only)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

// Log configuration on startup (for debugging)
console.log("Email Configuration Loaded:");
console.log("- EMAIL_USER:", EMAIL_USER);
console.log("- EMAIL_PASS:", EMAIL_PASS ? "✓ (set)" : "✗ (missing)");

// Configure Nodemailer transporter with SMTP
const transporterConfig = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true
};
if (EMAIL_USER && EMAIL_PASS) {
    transporterConfig.auth = { user: EMAIL_USER, pass: EMAIL_PASS };
} else {
    console.warn('EMAIL_USER or EMAIL_PASS not set. SMTP auth will likely fail. Set these in Backend/.env or environment variables.');
}
const transporter = nodemailer.createTransport(transporterConfig);

// Verify transporter connection
let smtpReady = true;
transporter.verify((error, success) => {
    if (error) {
        smtpReady = false;
        console.error("❌ Email Configuration Error:", error.message);
        console.error("→ Common fixes: ensure EMAIL_USER is correct, enable 2FA on the Gmail account and create an App Password, or configure OAuth2. See: https://support.google.com/mail/?p=BadCredentials");
        console.error("→ For local development you can set NODE_ENV=development to use Ethereal fallback (preview URL will be returned).");
    } else {
        smtpReady = true;
        console.log("✅ Email Service Ready - Connected to SMTP");
    }
});

/**
 * Generate random 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Email
 * POST /api/email-otp/send
 * Body: { email: "user@example.com" }
 */
router.post("/send", async (req, res) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase();

        // Generate OTP
        const otp = generateOtp();

        // Store OTP with expiry
        otpStore.set(normalizedEmail, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_TIME,
            attempts: 0
        });

        console.log(`Sending OTP to ${normalizedEmail}: ${otp}`);

        // Send OTP via Email
        try {
            await transporter.sendMail({
                from: EMAIL_USER,
                to: normalizedEmail,
                subject: "MKR Foods - Your OTP Verification Code",
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">MKR Foods</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                Your OTP verification code is:
              </p>
              <div style="background-color: #ff6b6b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
                This OTP will expire in 5 minutes. Do not share this code with anyone.
              </p>
              <p style="color: #999; font-size: 14px;">
                If you didn't request this code, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                MKR Foods © 2025. All rights reserved.
              </p>
            </div>
          </div>
        `
            });

            console.log(`OTP email sent successfully to ${normalizedEmail}`);

            return res.status(200).json({
                success: true,
                message: "OTP sent to your email",
                email: normalizedEmail
            });
        } catch (emailError) {
            console.error("Email sending error:", emailError);

            // If SMTP auth failed and we're in development, attempt Ethereal fallback so devs can preview
            if (!smtpReady && process.env.NODE_ENV !== 'production') {
                try {
                    const testAccount = await nodemailer.createTestAccount();
                    const testTransporter = nodemailer.createTransport({
                        host: testAccount.smtp.host,
                        port: testAccount.smtp.port,
                        secure: testAccount.smtp.secure,
                        auth: {
                            user: testAccount.user,
                            pass: testAccount.pass
                        }
                    });

                    const info = await testTransporter.sendMail({
                        from: EMAIL_USER,
                        to: normalizedEmail,
                        subject: "MKR Foods - Your OTP Verification Code (Ethereal)",
                        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">MKR Foods (Ethereal)</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 20px;">Your OTP verification code is:</p>
              <div style="background-color: #ff6b6b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 14px; margin-bottom: 20px;">This OTP will expire in 5 minutes. Do not share this code with anyone.</p>
            </div>
          </div>
        `
                    });

                    const previewUrl = nodemailer.getTestMessageUrl(info);
                    console.log(`Ethereal preview URL: ${previewUrl}`);

                    return res.status(200).json({
                        success: true,
                        message: "OTP generated and sent via Ethereal (development fallback).",
                        email: normalizedEmail,
                        previewUrl
                    });
                } catch (ethError) {
                    console.error("Ethereal fallback failed:", ethError);
                }
            }

            // For production or if Ethereal fallback failed, return an informative error
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please check SMTP credentials (EMAIL_USER/EMAIL_PASS) and Gmail app-passwords.",
                guidance: process.env.NODE_ENV === 'development' ? "If using Gmail, enable 2FA and create an App Password, then set EMAIL_PASS to the app password. See: https://support.google.com/mail/?p=BadCredentials" : undefined,
                error: process.env.NODE_ENV === "development" ? (emailError && emailError.message ? emailError.message : String(emailError)) : undefined
            });
        }
    } catch (error) {
        console.error("Error in send OTP:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * Verify OTP
 * POST /api/email-otp/verify
 * Body: { email: "user@example.com", otp: "6-digit-otp" }
 */
router.post("/verify", (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase();

        // Check if OTP exists
        if (!otpStore.has(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });
        }

        const storedOtpData = otpStore.get(normalizedEmail);

        // Check if OTP has expired
        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Check attempt count (max 3 attempts)
        if (storedOtpData.attempts >= 3) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Please request a new OTP."
            });
        }

        // Verify OTP
        if (storedOtpData.otp === otp) {
            // OTP is correct, remove from storage
            otpStore.delete(normalizedEmail);

            return res.status(200).json({
                success: true,
                message: "OTP verified successfully",
                email: normalizedEmail,
                verified: true
            });
        } else {
            // OTP is incorrect, increment attempts
            storedOtpData.attempts += 1;
            otpStore.set(normalizedEmail, storedOtpData);

            return res.status(400).json({
                success: false,
                message: `Invalid OTP. Attempts remaining: ${3 - storedOtpData.attempts}`,
                attemptsRemaining: 3 - storedOtpData.attempts
            });
        }
    } catch (error) {
        console.error("Error in verify OTP:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * Resend OTP
 * POST /api/email-otp/resend
 * Body: { email: "user@example.com" }
 */
router.post("/resend", async (req, res) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase();

        // Remove old OTP
        if (otpStore.has(normalizedEmail)) {
            otpStore.delete(normalizedEmail);
        }

        // Generate new OTP
        const otp = generateOtp();
        otpStore.set(normalizedEmail, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_TIME,
            attempts: 0
        });

        console.log(`Resending OTP to ${normalizedEmail}: ${otp}`);

        // Send OTP via Email
        try {
            await transporter.sendMail({
                from: EMAIL_USER,
                to: normalizedEmail,
                subject: "MKR Foods - Your New OTP Verification Code",
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">MKR Foods</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                Your new OTP verification code is:
              </p>
              <div style="background-color: #ff6b6b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
                This OTP will expire in 5 minutes. Do not share this code with anyone.
              </p>
              <p style="color: #999; font-size: 14px;">
                If you didn't request this code, please ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">
                MKR Foods © 2025. All rights reserved.
              </p>
            </div>
          </div>
        `
            });

            return res.status(200).json({
                success: true,
                message: "New OTP sent to your email",
                email: normalizedEmail
            });
        } catch (emailError) {
            console.error("Email sending error:", emailError);

            if (!smtpReady && process.env.NODE_ENV !== 'production') {
                try {
                    const testAccount = await nodemailer.createTestAccount();
                    const testTransporter = nodemailer.createTransport({
                        host: testAccount.smtp.host,
                        port: testAccount.smtp.port,
                        secure: testAccount.smtp.secure,
                        auth: {
                            user: testAccount.user,
                            pass: testAccount.pass
                        }
                    });

                    const info = await testTransporter.sendMail({
                        from: EMAIL_USER,
                        to: normalizedEmail,
                        subject: "MKR Foods - Your New OTP Verification Code (Ethereal)",
                        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">MKR Foods (Ethereal)</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 20px;">Your new OTP verification code is:</p>
              <div style="background-color: #ff6b6b; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 14px; margin-bottom: 20px;">This OTP will expire in 5 minutes. Do not share this code with anyone.</p>
            </div>
          </div>
        `
                    });

                    const previewUrl = nodemailer.getTestMessageUrl(info);
                    console.log(`Ethereal preview URL: ${previewUrl}`);

                    return res.status(200).json({
                        success: true,
                        message: "New OTP generated and sent via Ethereal (development fallback).",
                        email: normalizedEmail,
                        previewUrl
                    });
                } catch (ethError) {
                    console.error("Ethereal fallback failed:", ethError);
                }
            }

            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please check SMTP credentials (EMAIL_USER/EMAIL_PASS).",
                guidance: process.env.NODE_ENV === 'development' ? "If using Gmail, enable 2FA and create an App Password, then set EMAIL_PASS to the app password." : undefined,
                error: process.env.NODE_ENV === "development" ? (emailError && emailError.message ? emailError.message : String(emailError)) : undefined
            });
        }
    } catch (error) {
        console.error("Error in resend OTP:", error);
        res.status(500).json({
            success: false,
            message: "Server error. Please try again.",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

/**
 * Check OTP status (for debugging)
 * GET /api/email-otp/status/:email
 */
router.get("/status/:email", (req, res) => {
    try {
        if (process.env.NODE_ENV !== "development") {
            return res.status(403).json({
                success: false,
                message: "Not available in production"
            });
        }

        const normalizedEmail = req.params.email.toLowerCase();

        if (otpStore.has(normalizedEmail)) {
            const otpData = otpStore.get(normalizedEmail);
            return res.status(200).json({
                success: true,
                email: normalizedEmail,
                otp: otpData.otp,
                expiresIn: Math.ceil((otpData.expiresAt - Date.now()) / 1000) + "s",
                attempts: otpData.attempts
            });
        }

        res.status(404).json({
            success: false,
            message: "No OTP found for this email"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking OTP status",
            error: error.message
        });
    }
});

export default router;
