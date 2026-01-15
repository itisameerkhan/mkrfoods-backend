import express from "express";
import { createPayment, verifyPayment, webhookVerification } from "../controllers/payment.js";

import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.route("/create").post(authMiddleware, createPayment);
router.route("/verify").post(verifyPayment);
router.route("/webhook").post(webhookVerification); 

export default router;