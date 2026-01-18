import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    otp: { type: String, required: true },
    name: { type: String, required: true }, // Store name temporarily
    password: { type: String, required: true }, // Store password temporarily
    createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-delete after 600 seconds (10 mins)
});

// Use existing model or create new one to avoid overwrite errors during hot-reload
const otpModel = mongoose.models.otp || mongoose.model("otp", otpSchema);

export default otpModel;
