import express from "express";
import { createPayment } from "../controllers/payment.js";

const router = express.Router();

router.route("/create").post(createPayment);

export default router;