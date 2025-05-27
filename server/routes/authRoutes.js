const express = require("express");
const admin = require("../firebase/firebaseAdmin");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const interviewController = require("../controllers/interviewController");
require('dotenv').config();

// Add debug logging for environment variables
console.log('Environment Variables Check:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
console.log('FIREBASE_PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);

// Middleware to validate interview ownership and access
const validateInterviewAccess = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const interviewDoc = await admin.firestore()
            .collection("interviews")
            .doc(id)
            .get();

        if (!interviewDoc.exists) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const interviewData = interviewDoc.data();
        if (interviewData.userId !== userId) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        req.interview = {
            id: id,
            ...interviewData
        };

        next();
    } catch (err) {
        console.error("Error validating interview access:", err);
        res.status(500).json({ error: err.message });
    }
};

// Test Firebase connection route
router.get("/test-firebase", async (req, res) => {
    try {
        console.log('Testing Firebase connection...');
        
        const db = admin.firestore();
        
        // Try to list collections instead of querying a specific one
        const collections = await db.listCollections();
        const collectionNames = collections.map(col => col.id);
        
        res.json({
            success: true,
            message: 'Firebase connected successfully',
            collections: collectionNames
        });
        
    } catch (error) {
        console.error('Firebase test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

router.post("/signup", async (req, res) => {
    try {
        const { email, name } = req.body;
        const token = req.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify the token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        // Check if user already exists in Firestore
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(uid)
            .get();

        if (userDoc.exists) {
            return res.status(400).json({
                error: 'User already exists',
                code: 'auth/user-already-exists'
            });
        }

        // Save user data to Firestore
        await admin.firestore()
            .collection("users")
            .doc(uid)
            .set({
                email,
                name,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

        return res.status(201).json({
            message: 'User created successfully',
            uid: uid
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(400).json({
            error: error.message,
            code: error.code || 'unknown-error'
        });
    }
});

router.post("/interview", verifyToken, async (req, res) => {
    try {
        const { role, skills, experience } = req.body;
        const userId = req.user.uid;

        const interview = {
            role,
            skills,
            experience,
            userId,
            status: 'created',
            questions: [],
            answers: [],
            feedbacks: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await admin.firestore().collection("interviews").add(interview);

        res.status(201).json({
            id: docRef.id,
            ...interview
        });
    } catch (err) {
        console.error("Error creating interview:", err);
        res.status(500).json({ error: err.message });
    }
});

// Updated interview route with detailed logging
router.get("/interview", async (req, res) => {
    console.log('=== Interview Route Called ===');
    console.log('Headers:', req.headers);
    
    try {
        // Check if Firebase is initialized
        console.log('Firebase apps:', admin.apps.length);
        
        // Check for authorization token
        const token = req.headers.authorization?.split('Bearer ')[1];
        
        if (!token) {
            console.log('No token provided');
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify the token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
            console.log('Token verified for user:', decodedToken.uid);
        } catch (tokenError) {
            console.error('Token verification failed:', tokenError);
            return res.status(401).json({ error: 'Invalid token' });
        }

        const userId = decodedToken.uid;
        
        const db = admin.firestore();
        console.log('Firestore instance created');
        
        const interviewsRef = db.collection("interviews");
        const snapshot = await interviewsRef.where("userId", "==", userId).get();
        console.log('Firestore query successful, docs:', snapshot.size);
        
        const interviews = [];
        snapshot.forEach(doc => {
            interviews.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Returning interviews:', interviews.length);
        res.json(interviews);
        
    } catch (error) {
        console.error('=== DETAILED ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', error);
        console.error('====================');
        
        res.status(500).json({ 
            error: 'Failed to fetch interviews',
            details: error.message,
            code: error.code
        });
    }
});

router.get("/interview/:id", verifyToken, validateInterviewAccess, async (req, res) => {
    try {
        res.json(req.interview);
    } catch (err) {
        console.error("Error fetching interview:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/interview/:id/generate-questions",
    verifyToken,
    validateInterviewAccess,
    interviewController.generateQuestions
);

router.post("/interview/:id/answers",
    verifyToken,
    validateInterviewAccess,
    interviewController.processAnswers
);

router.post("/interview/:id/progress", verifyToken, validateInterviewAccess, async (req, res) => {
    try {
        const { currentIndex, answer, remainingTime, updatedAt } = req.body;
        const interviewRef = admin.firestore().collection("interviews").doc(req.params.id);

        await interviewRef.update({
            currentIndex,
            [`answers.${currentIndex}`]: answer,
            remainingTime,
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Error saving progress:", err);
        res.status(500).json({ error: "Failed to save progress" });
    }
});

//Complete interview route
router.post("/interview/:id/complete", verifyToken, validateInterviewAccess, async (req, res) => {
    try {
        const interviewRef = admin.firestore().collection("interviews").doc(req.params.id);

        await interviewRef.update({
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Interview completed successfully'
        });
    } catch (err) {
        console.error("Error completing interview:", err);
        res.status(500).json({ error: "Failed to complete interview" });
    }
});

//Reset interview
router.post("/interview/:id/reset", async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);

        await admin.firestore()
            .collection("interviews")
            .doc(id)
            .update({
                status: 'created',
                questions: [],
                answers: [],
                lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

        res.status(200).json({ message: 'Interview reset successfully' });
    } catch (error) {
        console.error('Error resetting interview:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
