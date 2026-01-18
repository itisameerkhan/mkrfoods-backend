import express from "express";
import nodemailer from "nodemailer";
import otpModel from "../models/otpModel.js";

const router = express.Router();

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
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Helps avoiding cert issues on some cloud providers
    }
};
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

        // Save to Database (Upsert)
        await otpModel.findOneAndUpdate(
            { email: normalizedEmail },
            { 
                otp, 
                createdAt: new Date(),
                // Provide dummy values for required fields in otpModel if any
                name: "EmailVerificationUser", 
                password: "N/A" 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

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

            // If SMTP auth failed and we're in development, attempt Ethereal fallback
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
                        subject: "MKR Foods (Ethereal Check)",
                        text: `Your OTP is ${otp}`
                    });

                    const previewUrl = nodemailer.getTestMessageUrl(info);
                    console.log(`Ethereal preview URL: ${previewUrl}`);

                    return res.status(200).json({
                        success: true,
                        message: "OTP generated (Dev Mode). Check server logs for Ethereal URL.",
                        email: normalizedEmail,
                        previewUrl
                    });
                } catch (ethError) {
                   // ignore
                }
            }

            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Check SMTP configuration.",
                error: emailError.message
            });
        }
    } catch (error) {
        console.error("Error in send OTP:", error);
        res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }
});

/**
 * Verify OTP
 * POST /api/email-otp/verify
 * Body: { email: "user@example.com", otp: "6-digit-otp" }
 */
router.post("/verify", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            });
        }

        const normalizedEmail = email.toLowerCase();

        // Check DB
        const record = await otpModel.findOne({ email: normalizedEmail });

        if (!record) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired. Request a new one."
            });
        }

        // Verify
        if (record.otp === otp) {
            await otpModel.deleteOne({ email: normalizedEmail });
            return res.status(200).json({
                success: true,
                message: "OTP verified successfully",
                email: normalizedEmail,
                verified: true
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP. Please try again."
            });
        }
    } catch (error) {
        console.error("Error in verify OTP:", error);
        res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
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

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const normalizedEmail = email.toLowerCase();
        const otp = generateOtp();

        // Update DB
        await otpModel.findOneAndUpdate(
            { email: normalizedEmail },
            { 
               otp, 
               createdAt: new Date(),
               name: "EmailVerificationUser", 
               password: "N/A"
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`Resending OTP to ${normalizedEmail}: ${otp}`);

        // Send Email
        try {
            await transporter.sendMail({
                from: EMAIL_USER,
                to: normalizedEmail,
                subject: "MKR Foods - Your New OTP Verification Code",
                html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
             <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px;">
              <h2 style="color: #333;">MKR Foods</h2>
              <p>Your new OTP is:</p>
              <h1 style="color: #ff6b6b; letter-spacing: 5px;">${otp}</h1>
              <p style="font-size: 12px; color: #999;">Expires in 5 minutes.</p>
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
             return res.status(500).json({
                success: false,
                message: "Failed to send email.",
                error: emailError.message
            });
        }
    } catch (error) {
        console.error("Error in resend OTP:", error);
        res.status(500).json({
            success: false,
            message: "Server error.",
            error: error.message
        });
    }
});

export default router;
