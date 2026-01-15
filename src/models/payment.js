import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    }, 
    paymentId: {
        type: String,
    },
    orderId: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    notes: {
        type: Object
    },
    status: {
        type: String,
        default: "created",
    }
},{timestamps:true})

export default mongoose.model("Payment", paymentSchema);