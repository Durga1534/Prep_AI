const admin = require("../firebase/firebaseAdmin");
const { model } = require("../services/gemini");

/**
 * Parse feedback text into a structured format
 * @param {string} feedbackText - Raw feedback text from AI
 * @returns {Object} Structured feedback object
 */
function parseFeedback(feedbackText) {
    const result = {
        score: null,
        strengths: [],
        improvements: [],
        feedback: ""
    };

    const scoreMatch = feedbackText.match(/SCORE:\s*(\d+)/i);
    if (scoreMatch) {
        result.score = parseInt(scoreMatch[1]);
    }

    const strengthsMatch = feedbackText.match(/STRENGTHS:([\s\S]*?)(?=IMPROVEMENTS:|$)/i);
    if (strengthsMatch) {
        const strengthsText = strengthsMatch[1].trim();
        result.strengths = strengthsText
            .split(/\n-\s*/)
            .map(item => item.trim())
            .filter(item => item && !item.startsWith('IMPROVEMENTS') && !item.startsWith('FEEDBACK'));

        if (result.strengths[0] === "") {
            result.strengths.shift();
        }
    }

    const improvementsMatch = feedbackText.match(/IMPROVEMENTS:([\s\S]*?)(?=FEEDBACK:|$)/i);
    if (improvementsMatch) {
        const improvementsText = improvementsMatch[1].trim();
        result.improvements = improvementsText
            .split(/\n-\s*/)
            .map(item => item.trim())
            .filter(item => item && !item.startsWith('FEEDBACK'));

        if (result.improvements[0] === "") {
            result.improvements.shift();
        }
    }

    const feedbackMatch = feedbackText.match(/FEEDBACK:([\s\S]*?)$/i);
    if (feedbackMatch) {
        result.feedback = feedbackMatch[1].trim();
    }

    return result;
}

/**
 * Create new interview
 */
exports.createInterview = async (req, res) => {
    try {
        const { role, skills, experience, duration, status } = req.body;
        const userId = req.user.uid;

        const interview = {
            role,
            skills,
            experience,
            duration,
            userId,
            status: 'created',
            questions: [],
            answers: [],
            feedbacks: [],
            parsedFeedbacks: [],
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
};

/**
 * Get all interviews for user
 */
exports.getAllInterviews = async (req, res) => {
    try {
        const userId = req.user.uid;
        const interviewsRef = admin.firestore().collection("interviews");
        const snapshot = await interviewsRef.where("userId", "==", userId).get();

        const interviews = [];
        snapshot.forEach(doc => {
            interviews.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json(interviews);
    } catch (err) {
        console.error("Error fetching interviews:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Generate interview questions based on role, skills and experience
 */
exports.generateQuestions = async (req, res) => {
    try {
        const id = req.params.id;
        const interviewDoc = await admin.firestore().collection("interviews").doc(id).get();

        if (!interviewDoc.exists) {
            return res.status(404).json({
                error: "Interview not found",
                details: `No interview found with ID: ${id}`
            });
        }

        const interviewData = interviewDoc.data();

        // Validate required fields
        const requiredFields = ['role', 'skills', 'experience'];
        const missingFields = requiredFields.filter(field => !interviewData[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: "Incomplete interview data",
                missingFields
            });
        }

        const role = interviewData.role;
        const skills = Array.isArray(interviewData.skills) ? interviewData.skills : [];
        if (skills.length === 0) {
            return res.status(400).json({
                error: "Skills field must be a non-empty array"
            });
        }
        const experience = interviewData.experience;

        console.log("Question Generation Parameters:", { id, role, skills, experience });

        const prompt = `Generate 10 technical interview questions for a ${role} with ${experience} year(s) experience.
Required skills: ${skills.join(", ")}

Guidelines:
- 4 must be coding questions with real-world coding tasks.
- 6 must be theoretical questions testing knowledge and concepts.
- Match the ${experience} year(s) experience level.
- Each question must test one or more of these skills: ${skills.join(", ")}
- Make questions progressively harder.

Format exactly as:
1. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
2. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
3. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
4. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
5. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
6. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
7. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
8. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
9. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question
10. [TYPE: Coding/Theory] [DIFFICULTY] Skill Being Tested: Question`;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        });

        if (!result.response) {
            throw new Error("No response from AI model");
        }

        const text = result.response.text();
        console.log("Raw API response:", text);

        let questions = text
            .split(/\d+\.\s+/)
            .filter(q => q.trim())
            .map(q => q.trim().replace(/\n+$/, '')); // trim trailing new lines

        if (!questions || questions.length < 10) {
            console.error("Generated questions:", questions);
            throw new Error("Failed to generate required number of questions");
        }

        questions = questions.slice(0, 10);

        await admin.firestore().collection("interviews").doc(id).update({
            questions,
            answers: new Array(10).fill(""),
            feedbacks: new Array(10).fill(""),
            parsedFeedbacks: new Array(10).fill(null),
            status: "in-progress",
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.json({
            success: true,
            questions,
            message: "Questions generated successfully"
        });
    } catch (err) {
        console.error("Question generation error:", err);
        res.status(500).json({
            success: false,
            error: "Error generating questions",
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};


/**
 * Process candidate answers and generate feedback
 */
exports.processAnswers = async (req, res) => {
    try {
        const { answer, questionIndex } = req.body;
        const interview = req.interview;

        if (!interview.questions[questionIndex]) {
            return res.status(400).json({ error: "Invalid question index" });
        }

        const prompt = `Evaluate this technical answer:

Q: ${interview.questions[questionIndex]}
A: ${answer}

Format:
SCORE: [1-10]

STRENGTHS:
- Point 1
- Point 2

IMPROVEMENTS:
- Point 1
- Point 2

FEEDBACK:
Brief assessment`;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.8,
                maxOutputTokens: 512,
            }
        });

        const response = await result.response;
        const rawFeedback = response.text();

        if (!rawFeedback) {
            throw new Error("Failed to generate feedback");
        }

        const parsedFeedback = parseFeedback(rawFeedback);
        const isLastQuestion = parseInt(questionIndex) === interview.questions.length - 1;

        const updateData = {
            [`answers.${questionIndex}`]: answer,
            [`feedbacks.${questionIndex}`]: rawFeedback,
            [`parsedFeedbacks.${questionIndex}`]: parsedFeedback,
            status: isLastQuestion ? "completed" : "in-progress",
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (isLastQuestion) {
            updateData.finalSummary = await generateFinalSummary(interview);
        }

        await admin.firestore().collection("interviews")
            .doc(interview.id)
            .update(updateData);

        res.json({
            success: true,
            feedback: rawFeedback,
            parsedFeedback,
            isComplete: isLastQuestion,
            questionNumber: parseInt(questionIndex) + 1,
            totalQuestions: interview.questions.length
        });
    } catch (err) {
        console.error("Answer processing error:", err);
        res.status(500).json({
            success: false,
            error: "Error processing answer",
            details: err.message
        });
    }
};

/**
 * Generate a final summary for the completed interview
 */
async function generateFinalSummary(interview) {
    try {
        const prompt = `Summarize ${interview.role} technical interview:
Skills: ${interview.skills.join(", ")}

Format:
SCORE: [0-100]

KEY STRENGTHS:
- Point 1
- Point 2

IMPROVEMENTS:
- Point 1
- Point 2

RECOMMENDATION:
Hire/No hire with brief justification`;

        const result = await model.generateContent({
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.8,
                maxOutputTokens: 512,
            }
        });

        const response = await result.response;
        const rawSummary = response.text();

        return {
            raw: rawSummary,
            parsed: parseFeedback(rawSummary)
        };
    } catch (error) {
        console.error("Final summary generation error:", error);
        return {
            raw: "Unable to generate final summary.",
            parsed: null
        };
    }
}

/**
 * Get current interview status and progress
 */
exports.getInterviewStatus = async (req, res) => {
    try {
        const interview = req.interview;
        const progress = {
            total: interview.questions.length,
            answered: interview.answers.filter(a => a).length,
            status: interview.status
        };

        res.json({
            success: true,
            progress
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Error fetching interview status",
            details: err.message
        });
    }
};

/**
 * Reset interview to initial state
 */
exports.resetInterview = async (req, res) => {
    try {
        const interviewId = req.interview.id;

        await admin.firestore().collection("interviews")
            .doc(interviewId)
            .update({
                questions: [],
                answers: [],
                feedbacks: [],
                parsedFeedbacks: [],
                finalSummary: null,
                status: "created",
                lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        res.json({
            success: true,
            message: "Interview reset successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Error resetting interview",
            details: err.message
        });
    }
};