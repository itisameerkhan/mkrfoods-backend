import express from "express";
import { createPayment, verifyPayment } from "../controllers/payment.js";

import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.route("/create").post(authMiddleware, createPayment);
router.route("/verify").post(verifyPayment);

export default router;