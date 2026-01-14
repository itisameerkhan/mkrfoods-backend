import express from "express";
import nodemailer from "nodemailer";
import fs from "fs";
import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";

let admin = null;

const router = express.Router();

// In-memory OTP and pending-user storage with expiration
const otpStore = new Map();
const pendingUsers = new Map();
const OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes

// Email configuration (from environment only)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Configure Nodemailer transporter (only set auth if credentials present)
const transporterConfig = {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
};
if (EMAIL_USER && EMAIL_PASS) {
    transporterConfig.auth = { user: EMAIL_USER, pass: EMAIL_PASS };
} else {
    console.warn('EMAIL_USER or EMAIL_PASS not set. SMTP auth will likely fail. Set these in Backend/.env or environment variables.');
}
const transporter = nodemailer.createTransport(transporterConfig);

// Initialize Firebase Admin if service account provided (lazy import)
let adminInitialized = false;
const initAdmin = async () => {
    if (adminInitialized) return true;
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!svc) {
        console.warn("FIREBASE_SERVICE_ACCOUNT not set - admin SDK unavailable");
        return false;
    }

    let creds;
    try {
        creds = JSON.parse(svc);
    } catch (err) {
        if (fs.existsSync(svc)) {
            creds = JSON.parse(fs.readFileSync(svc, "utf8"));
        } else {
            console.warn("FIREBASE_SERVICE_ACCOUNT is not valid JSON nor a file path");
            return false;
        }
    }

    try {
        const mod = await import('firebase-admin');
        admin = mod.default || mod;
    } catch (err) {
        console.error('firebase-admin package not installed. Install with: npm i firebase-admin');
        return false;
    }

    admin.initializeApp({
        credential: admin.credential.cert(creds),
    });
    adminInitialized = true;
    console.log("Firebase Admin initialized");
    return true;
};

/**
 * Generate random 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Email - POST /api/send-otp
 * Body: { name, email, password }
 * Stores pending user in memory until OTP verification
 */
router.post("/send-otp", async (req, res) => {
    try {
        const { email, name, password } = req.body;

        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!normalizedEmail || !normalizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ success: false, message: "Valid email is required" });
        }
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: "Name is required" });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        // Generate OTP and store pending user (use normalized email as key)
        const otp = generateOtp();
        const expiryTime = Date.now() + OTP_EXPIRY_TIME;
        otpStore.set(normalizedEmail, { otp, expiryTime });
        pendingUsers.set(normalizedEmail, { name, password, expiryTime });

        // Send OTP email
        const mailOptions = {
            from: EMAIL_USER,
            to: email,
            subject: "🔐 Verify Your MKR Foods Account",
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">MKR Foods</h1>
          </div>
          <div style="padding: 40px 20px; background: #f7fafc;">
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 20px;">Verify Your Email</h2>
            <p style="color: #4a5568; text-align: center; font-size: 16px; margin-bottom: 30px;">Your One-Time Password (OTP) is:</p>
            <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; border: 2px solid #667eea; margin-bottom: 30px;">
              <h1 style="color: #667eea; font-size: 36px; font-weight: bold; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #718096; text-align: center; font-size: 14px; margin-bottom: 20px;">This code will expire in 10 minutes.</p>
            <p style="color: #718096; text-align: center; font-size: 13px;">If you didn't request this code, please ignore this email.</p>
          </div>
          <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">© 2025 MKR Foods. All rights reserved.</p>
          </div>
        </div>`,
        };

        await transporter.sendMail(mailOptions);

        console.log(`Pending users keys: ${Array.from(pendingUsers.keys()).join(', ')}`);
        console.log(`OTP store keys: ${Array.from(otpStore.keys()).join(', ')}`);

        res.status(200).json({ success: true, message: "OTP sent successfully to your email" });
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
    }
});

/**
 * Verify OTP - POST /api/verify-otp
 * Body: { email, otp }
 * On success: returns email, name, password - frontend handles Firebase signup
 */
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!normalizedEmail || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP are required" });
        }

        console.log(`✓ Verify attempt for: ${normalizedEmail}`);
        console.log(`  Pending users keys: ${Array.from(pendingUsers.keys()).join(', ')}`);
        console.log(`  OTP store keys: ${Array.from(otpStore.keys()).join(', ')}`);

        const stored = otpStore.get(normalizedEmail);
        const pending = pendingUsers.get(normalizedEmail);

        if (!stored || !pending) {
            return res.status(400).json({ success: false, message: "OTP not found or no pending signup. Please request a new OTP." });
        }

        if (Date.now() > stored.expiryTime || Date.now() > pending.expiryTime) {
            otpStore.delete(normalizedEmail);
            pendingUsers.delete(normalizedEmail);
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
        }

        if (stored.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }

        // OTP is valid! Return user data so frontend can create Firebase account
        const { name, password } = pending;
        otpStore.delete(normalizedEmail);
        pendingUsers.delete(normalizedEmail);

        console.log(`✅ OTP verified for: ${normalizedEmail}`);

        res.status(200).json({
            success: true,
            message: "Email verified successfully!",
            data: {
                email: normalizedEmail,
                name,
                password
            }
        });
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ success: false, message: "Failed to verify OTP", error: error.message });
    }
});

/**
 * Resend OTP - POST /api/resend-otp
 * Body: { email }
 */
router.post("/resend-otp", async (req, res) => {
    try {
        const { email } = req.body;

        const normalizedEmail = (email || '').toLowerCase().trim();

        if (!normalizedEmail || !normalizedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ success: false, message: "Valid email is required" });
        }

        // Ensure there is a pending signup for this email
        if (!pendingUsers.has(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "No pending signup for this email. Please submit signup form first." });
        }

        const otp = generateOtp();
        const expiryTime = Date.now() + OTP_EXPIRY_TIME;
        otpStore.set(normalizedEmail, { otp, expiryTime });

        const mailOptions = {
            from: EMAIL_USER,
            to: normalizedEmail,
            subject: "🔐 Your New OTP Code",
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">MKR Foods</h1>
          </div>
          <div style="padding: 40px 20px; background: #f7fafc;">
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 20px;">New OTP Code</h2>
            <p style="color: #4a5568; text-align: center; font-size: 16px; margin-bottom: 30px;">Your new One-Time Password (OTP) is:</p>
            <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; border: 2px solid #667eea; margin-bottom: 30px;">
              <h1 style="color: #667eea; font-size: 36px; font-weight: bold; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #718096; text-align: center; font-size: 14px; margin-bottom: 20px;">This code will expire in 10 minutes.</p>
          </div>
          <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">© 2025 MKR Foods. All rights reserved.</p>
          </div>
        </div>`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ success: false, message: "Failed to resend OTP", error: error.message });
    }
});

export default router;
