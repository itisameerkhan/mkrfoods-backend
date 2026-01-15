import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

// App Config
const app = express();
const port = process.env.PORT || 8080;

// Import routes after dotenv.config() so they can read env vars at module evaluation
const emailOtpRoutes = (await import("./routes/emailOtp.js")).default;
const signupOtpRoutes = (await import("./routes/signupOtp.js")).default;
const mobileOtpRoutes = (await import("./routes/mobileotp.js")).default;
const paymentRouter = (await import("./routes/payment.js")).default;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/email-otp", emailOtpRoutes);
app.use("/api", signupOtpRoutes);
app.use("/api/mobile-otp", mobileOtpRoutes);
app.use("/api/payment", paymentRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Server is running" });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "MKR Foods Backend API" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// DB Connection and Server Start
const startServer = async () => {
    try {
        await connectDB();
        
        app.listen(port, () => {
            console.log(`SERVER IS LISTENING ON PORT: ${port}`);
            console.log("Environment:", process.env.NODE_ENV || "development");
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
};

startServer();
