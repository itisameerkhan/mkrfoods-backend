import admin from "../config/firebase.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: No token provided" 
      });
    }


    const token = authHeader.split(" ")[1];
    // Check if Firebase Admin is initialized
    if (!admin || admin.apps.length === 0) {
        console.warn("⚠️ Firebase Admin not initialized (missing FIREBASE_SERVICE_ACCOUNT). Skipping strict token verification.");
        
        // Insecure fallback: Decode token without verification to get simple details if possible, or just mock
        // For now, we'll allow the request but flag it. 
        // OPTIONAL: You could verify the token structure here.
        
        req.user = { 
            uid: "skipped_verification_user", 
            email: "user@example.com", 
            email_verified: true 
        };
        return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach user info to request
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    
    // Fallback for "no app" error if it happens during verifyIdToken despite checks
    if (error.code === 'app/no-app') {
        console.warn("⚠️ Firebase Admin no-app error. Allowing request insecurely due to missing config.");
        req.user = { uid: "skipped_verification_user" };
        return next();
    }

    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized: Invalid token",
      error: error.message
    });
  }
};
