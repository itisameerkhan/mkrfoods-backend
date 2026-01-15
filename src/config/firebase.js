import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

let admin;

try {
    const mod = await import('firebase-admin');
    admin = mod.default || mod;
    
    // Check if already initialized to avoid "Default app has already been configured" error
    if (admin.apps.length === 0) {
        const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!svc) {
            console.warn("FIREBASE_SERVICE_ACCOUNT not set in environment variables");
        } else {
            let creds;
            try {
                // Try parsing as JSON string first
                creds = JSON.parse(svc);
            } catch (err) {
                // If failed, try reading as file path
                if (fs.existsSync(svc)) {
                    creds = JSON.parse(fs.readFileSync(svc, "utf8"));
                } else {
                     console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON nor a file path");
                }
            }

            if (creds) {
                admin.initializeApp({
                    credential: admin.credential.cert(creds),
                });
                console.log("Firebase Admin initialized successfully in config/firebase.js");
            }
        }
    }
} catch (err) {
    console.error('Failed to initialize firebase-admin:', err);
}

export default admin;
