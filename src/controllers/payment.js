import razorpayInstance from "../utils/razorpay.js";
import Payment from "../models/payment.js";
import crypto from "crypto";
import admin from "../config/firebase.js";
import Razorpay from "razorpay";


export const createPayment = async (req, res) => {
  try {
    const { amount, name, email, phone, userId, cart, address } = req.body;

    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "order_rcptid_123",
      notes: {
        name: name || "Guest",
        email: email || "",
        phone: phone || "",
      },
    });

    console.log("create payment");
    console.log(order);

    
    const payment = new Payment({
      userId: userId || req.user.uid,
      paymentId: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      notes: order.notes,
      cart: cart || { items: [] },
      address: address || {},
      status: order.status,
    });

    const savedPayment = await payment.save();

    // Save to Firebase Firestore
    try {
      if (admin && admin.apps?.length && admin.firestore) {
        await admin.firestore().collection("payments").doc(order.id).set({
          userId: payment.userId,
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          notes: payment.notes,
          cart: cart || { items: [] },
          address: payment.address,
          status: payment.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (fbError) {
      console.error("Firebase Firestore Error:", fbError);
      // Don't fail the request if firebase sync fails, just log it
    }

    res.json({
      success: true,
      data: savedPayment.toJSON(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // payment is successful

      const payment = await Payment.findOne({ orderId: razorpay_order_id });

      if (payment) {
        payment.paymentId = razorpay_payment_id;
        payment.status = "success";
        await payment.save();

        // Update Firebase Firestore
        try {
          if (admin && admin.apps?.length && admin.firestore) {
            await admin
              .firestore()
              .collection("payments")
              .doc(razorpay_order_id)
              .update({
                paymentId: razorpay_payment_id,
                status: "success",
                updatedAt: new Date(),
              });
          }
        } catch (fbError) {
          console.error("Firebase Firestore Update Error:", fbError);
        }
      }

      res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const webhookVerification = async (req, res) => {
  try {

    console.log("webhook called");
    
    const webhookSignature = req.headers["x-razorpay-signature"];

    console.log(webhookSignature);
    
    const isWebhookValid = Razorpay.validateWebhookSignature(
      req.rawBody,
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if(!isWebhookValid){
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    console.log("valid webhook signature");
    

    const paymentDetails = req.body.payload.payment.entity;
    const payment = await Payment.findOne({orderId: paymentDetails.order_id});
    payment.status = paymentDetails.status;
    await payment.save();

    console.log("payment saved");
    
    if(req.body.event === "payment.captured"){
      
    }
    if(req.body.event === "payment.failed"){
      
    }

    return res.status(200).json({
      success: true,
      message: "Webhook verified successfully",
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getPaymentsByUser = async (req, res) => {
  try {
    // Use userId from query if provided (for cases where backend auth verification skips), otherwise use authenticated user
    const userId = req.query.userId || req.user.uid;
    console.log("Fetching orders for userId:", userId);
    
    const payments = await Payment.find({ userId, status: "success" })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order history",
      error: error.message
    });
  }
};
