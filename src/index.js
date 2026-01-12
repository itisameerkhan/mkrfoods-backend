import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

const app = express();

// Import routes after dotenv.config() so they can read env vars at module evaluation
const emailOtpRoutes = (await import("./routes/emailOtp.js")).default;
const signupOtpRoutes = (await import("./routes/signupOtp.js")).default;
const mobileOtpRoutes = (await import("./routes/mobileotp.js")).default;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/email-otp", emailOtpRoutes);
app.use("/api", signupOtpRoutes);
app.use("/api/mobile-otp", mobileOtpRoutes);

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

app.listen(process.env.PORT || 8080, () => {
  console.log("SERVER IS LISTENING ON PORT: ", process.env.PORT || 8080);
  console.log("Environment:", process.env.NODE_ENV || "development");
});
