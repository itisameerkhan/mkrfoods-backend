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
    cart: {
        items: [{
            productId: { type: String },
            name: { type: String },
            image: { type: String },
            variants: [{
                weight: { type: String },
                price: { type: Number },
                quantity: { type: Number }
            }],
            totalPrice: { type: Number }
        }]
    },
    status: {
        type: String,
        default: "created",
    },
    orderStatus: {
        type: String,
        default: "In Transit",
        enum: ["In Transit", "Delivered", "Cancelled"]
    },
    expectedDate: {
        type: String,
        default: "Updated soon"
    }
},{timestamps:true})

export default mongoose.model("Payment", paymentSchema);