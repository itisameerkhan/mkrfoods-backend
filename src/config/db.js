import mongoose from "mongoose";

export const connectDB = async () => {
    // Using provided connection string directly to fix connection issue
    // TODO: Move this back to .env for production security
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("❌ MONGO_URI is missing in .env file");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("✅ DB Connected");
    } catch (error) {
        console.error("❌ DB Connection Error:", error);
        process.exit(1);
    }
};
