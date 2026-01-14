import razorpayInstance from "../utils/razorpay.js"
import Payment from "../models/payment.js";

export const createPayment = async (req, res) => {
    try {
      const order = await razorpayInstance.orders.create({
        amount: 5000,
        currency: "INR",
        receipt: "order_rcptid_123",
        notes: {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "phone": "1234567890"
        }
      });
      
      console.log(order);

      const payment = new Payment({
        // userId: req.user._id,
        paymentId: order.id,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        notes: order.notes,
        status: order.status
      })

      await payment.save(); 
      
      res.json({
        success: true,
        data: order
      })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        }) 
    }
}