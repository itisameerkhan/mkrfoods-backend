import express from "express";
import wbm from "wbm";

const router = express.Router();

// In-memory OTP storage with expiration
const otpStore = new Map();
const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Generate random 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via WhatsApp
 * POST /api/mobile-otp/send
 * Body: { phone: "1234567890" } (without country code, will add +91 for India)
 */
router.post("/send", async (req, res) => {
    try {
        const { phone } = req.body;

        // Validation
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Basic phone validation (10 digits for Indian numbers)
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number format. Please enter 10-digit Indian mobile number."
            });
        }

        // Normalize phone number (add +91 for India)
        const normalizedPhone = `+91${phone}`;

        // Generate OTP
        const otp = generateOtp();

        // Store OTP with expiry
        otpStore.set(normalizedPhone, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_TIME,
            attempts: 0
        });

        console.log(`Sending OTP to ${normalizedPhone}: ${otp}`);

        // Send OTP via WhatsApp using wbm
        try {
            // Initialize wbm (this will open browser and login to WhatsApp Web)
            await wbm.start({ showBrowser: false, qrCodeData: true, session: false });

            // Send message
            const message = `🔐 MKR Foods - Your OTP Verification Code\n\nYour OTP is: ${otp}\n\nThis code will expire in 5 minutes.\nDo not share this code with anyone.\n\nIf you didn't request this code, please ignore this message.`;

            await wbm.send([normalizedPhone], message);

            // End wbm session
            await wbm.end();

            console.log(`OTP WhatsApp message sent successfully to ${normalizedPhone}`);

            return res.status(200).json({
                success: true,
                message: "OTP sent to your WhatsApp",
                phone: normalizedPhone
            });
        } catch (whatsappError) {
            console.error("WhatsApp sending error:", whatsappError);

            return res.status(500).json({
                success: false,
                message: "Failed to send OTP via WhatsApp. Please ensure WhatsApp Web is accessible and try again.",
                error: process.env.NODE_ENV === "development" ? whatsappError.message : undefined
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
 * POST /api/mobile-otp/verify
 * Body: { phone: "1234567890", otp: "6-digit-otp" }
 */
router.post("/verify", (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Validation
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required"
            });
        }

        // Normalize phone number
        const normalizedPhone = `+91${phone}`;

        // Check if OTP exists
        if (!otpStore.has(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });
        }

        const storedOtpData = otpStore.get(normalizedPhone);

        // Check if OTP has expired
        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(normalizedPhone);
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Check attempt count (max 3 attempts)
        if (storedOtpData.attempts >= 3) {
            otpStore.delete(normalizedPhone);
            return res.status(400).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Please request a new OTP."
            });
        }

        // Verify OTP
        if (storedOtpData.otp === otp) {
            // OTP is correct, remove from storage
            otpStore.delete(normalizedPhone);

            return res.status(200).json({
                success: true,
                message: "OTP verified successfully",
                phone: normalizedPhone,
                verified: true
            });
        } else {
            // OTP is incorrect, increment attempts
            storedOtpData.attempts += 1;
            otpStore.set(normalizedPhone, storedOtpData);

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
 * POST /api/mobile-otp/resend
 * Body: { phone: "1234567890" }
 */
router.post("/resend", async (req, res) => {
    try {
        const { phone } = req.body;

        // Validation
        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Normalize phone number
        const normalizedPhone = `+91${phone}`;

        // Remove old OTP
        if (otpStore.has(normalizedPhone)) {
            otpStore.delete(normalizedPhone);
        }

        // Generate new OTP
        const otp = generateOtp();
        otpStore.set(normalizedPhone, {
            otp,
            expiresAt: Date.now() + OTP_EXPIRY_TIME,
            attempts: 0
        });

        console.log(`Resending OTP to ${normalizedPhone}: ${otp}`);

        // Send OTP via WhatsApp
        try {
            // Initialize wbm
            await wbm.start({ showBrowser: false, qrCodeData: true, session: false });

            // Send message
            const message = `🔐 MKR Foods - Your New OTP Verification Code\n\nYour new OTP is: ${otp}\n\nThis code will expire in 5 minutes.\nDo not share this code with anyone.`;

            await wbm.send([normalizedPhone], message);

            // End wbm session
            await wbm.end();

            return res.status(200).json({
                success: true,
                message: "New OTP sent to your WhatsApp",
                phone: normalizedPhone
            });
        } catch (whatsappError) {
            console.error("WhatsApp resend error:", whatsappError);

            return res.status(500).json({
                success: false,
                message: "Failed to resend OTP via WhatsApp. Please try again.",
                error: process.env.NODE_ENV === "development" ? whatsappError.message : undefined
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
 * GET /api/mobile-otp/status/:phone
 */
router.get("/status/:phone", (req, res) => {
    try {
        if (process.env.NODE_ENV !== "development") {
            return res.status(403).json({
                success: false,
                message: "Not available in production"
            });
        }

        const normalizedPhone = `+91${req.params.phone}`;

        if (otpStore.has(normalizedPhone)) {
            const otpData = otpStore.get(normalizedPhone);
            return res.status(200).json({
                success: true,
                phone: normalizedPhone,
                otp: otpData.otp,
                expiresIn: Math.ceil((otpData.expiresAt - Date.now()) / 1000) + "s",
                attempts: otpData.attempts
            });
        }

        res.status(404).json({
            success: false,
            message: "No OTP found for this phone number"
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
