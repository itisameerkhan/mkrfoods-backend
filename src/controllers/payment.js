import razorpayInstance from "../utils/razorpay.js"

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