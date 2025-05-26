import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import CodeEditor from '@uiw/react-textarea-code-editor'; // Add this import

const AiInterviewPage = () => {
    const [interview, setInterview] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatingQuestions, setGeneratingQuestions] = useState(false);
    const [useCodeEditor, setUseCodeEditor] = useState(false); // Add this state
    const { id } = useParams();
    const navigate = useNavigate();
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchInterview(user);
            } else {
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [id, navigate]);

    // Detect if the current question is a coding question and set editor mode automatically
    useEffect(() => {
        if (interview?.questions?.[currentQuestionIndex]) {
            const question = interview.questions[currentQuestionIndex].toLowerCase();
            const isCodingQuestion =
                question.includes('code') ||
                question.includes('implement') ||
                question.includes('function') ||
                question.includes('algorithm') ||
                question.includes('programming') ||
                question.includes('[type: coding]');

            setUseCodeEditor(isCodingQuestion);
        }
    }, [currentQuestionIndex, interview?.questions]);

    const fetchInterview = async (user) => {
        try {
            setLoading(true);
            const token = await user.getIdToken();

            const response = await axios.get(`/api/auth/interview/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log("Interview data fetched:", response.data);

            setInterview({
                ...response.data,
                questions: response.data.questions || [],
                answers: response.data.answers || [],
                feedbacks: response.data.feedbacks || [],
                parsedFeedbacks: response.data.parsedFeedbacks || []
            });

        } catch (error) {
            console.error('Error fetching interview:', error);
            toast.error('Failed to load interview');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    // Add this function to detect language
    const detectLanguage = (question) => {
        if (!question) return 'javascript';

        const questionLower = question.toLowerCase();

        if (questionLower.includes('javascript') || questionLower.includes('js')) return 'javascript';
        if (questionLower.includes('typescript') || questionLower.includes('ts')) return 'typescript';
        if (questionLower.includes('html')) return 'html';
        if (questionLower.includes('css')) return 'css';
        if (questionLower.includes('python')) return 'python';
        if (questionLower.includes('java ')) return 'java';
        if (questionLower.includes('c++')) return 'cpp';
        if (questionLower.includes('c#')) return 'csharp';
        if (questionLower.includes('php')) return 'php';
        if (questionLower.includes('go ') || questionLower.includes('golang')) return 'go';
        if (questionLower.includes('ruby')) return 'ruby';
        if (questionLower.includes('swift')) return 'swift';
        if (questionLower.includes('react')) return 'jsx';

        // Default to javascript
        return 'javascript';
    };

    const handleGenerateQuestions = async () => {
        try {
            setGeneratingQuestions(true);
            const token = await auth.currentUser?.getIdToken();
            console.log("Starting question generation for interview ID:", id);

            const interviewRes = await axios.get(`/api/auth/interview/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Interview details for question generation:", interviewRes.data);

            if(!interviewRes.data.role || !interviewRes.data.skills || !interviewRes.data.experience) {
                console.error("Missing required interview data:", {
                    role: interviewRes.data.role,
                    skills: interviewRes.data.skills,
                    experience: interviewRes.data.experience
                });
                toast.error("Missing information: Role, skills or experience is missing");
                return;
            }

            console.log("Sending request to generate questions with data:", {
                role: interviewRes.data.role,
                skills: interviewRes.data.skills,
                experience: interviewRes.data.experience
            });

            try {
                const response = await axios.post(
                    `/api/auth/interview/${id}/generate-questions`,
                    {
                        role: interviewRes.data.role,
                        skills: interviewRes.data.skills,
                        experience: interviewRes.data.experience
                    },
                    {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );
                console.log("Question generation response:", response.data);

                // Update state with new questions
                setInterview(prev => ({
                    ...prev,
                    questions: response.data.questions,
                    answers: new Array(response.data.questions.length).fill(""),
                    feedbacks: new Array(response.data.questions.length).fill(""),
                    parsedFeedbacks: new Array(response.data.questions.length).fill(null),
                    status: 'in-progress'
                }));

                toast.success('Questions generated!');
            } catch (innerError) {
                console.error('Question generation API error:', innerError);
                if (innerError.response) {
                    console.error('Error response data:', innerError.response.data);
                    console.error('Error response status:', innerError.response.status);
                }
                throw innerError;
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error(error.response?.data?.error || 'Failed to generate questions');
        } finally {
            setGeneratingQuestions(false);
        }
    };

    const submitAnswer = async () => {
        if (!answer.trim()) {
            toast.warn('Please provide an answer');
            return;
        }

        try {
            setLoading(true);
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                toast.error('Please log in first');
                navigate('/login');
                return;
            }

            const response = await axios.post(
                `/api/auth/interview/${id}/answers`,
                {
                    answer,
                    questionIndex: currentQuestionIndex
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            // Update the interview state with the new answer and feedback
            setInterview(prev => {
                const newAnswers = [...prev.answers];
                const newFeedbacks = [...prev.feedbacks];
                const newParsedFeedbacks = [...(prev.parsedFeedbacks || [])];

                newAnswers[currentQuestionIndex] = answer;
                newFeedbacks[currentQuestionIndex] = response.data.feedback;
                newParsedFeedbacks[currentQuestionIndex] = response.data.parsedFeedback;

                return {
                    ...prev,
                    answers: newAnswers,
                    feedbacks: newFeedbacks,
                    parsedFeedbacks: newParsedFeedbacks
                };
            });

            // Check if interview is complete
            if (response.data.isComplete) {
                toast.success('Interview completed!');
                navigate(`/history/${id}`);
            } else {
                // Move to next question
                setCurrentQuestionIndex(prev => prev + 1);
                setAnswer('');
                toast.success(`Question ${response.data.questionNumber} submitted successfully!`);
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            toast.error('Failed to submit answer');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h1 className="text-2xl font-bold text-teal-800 mb-4">
                        {interview?.role || 'Technical'} Interview
                    </h1>

                    {interview?.questions?.length > 0 ? (
                        <div className="space-y-6">
                            {/* Progress indicator */}
                            <div className="mb-4">
                                <p className="text-gray-600">Question {currentQuestionIndex + 1} of {interview.questions.length}</p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Question */}
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h2 className="text-lg font-medium text-gray-800 mb-2">Question:</h2>
                                <p className="text-gray-700">{interview.questions[currentQuestionIndex]}</p>
                            </div>

                            {/* Answer input */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">Your Answer:</label>

                                    <button
                                        type="button"
                                        onClick={() => setUseCodeEditor(!useCodeEditor)}
                                        className="text-sm text-teal-600 hover:text-teal-800"
                                    >
                                        {useCodeEditor ? 'Switch to Text' : 'Switch to Code Editor'}
                                    </button>
                                </div>

                                {useCodeEditor ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <CodeEditor
                                            value={answer}
                                            language={detectLanguage(interview.questions[currentQuestionIndex])}
                                            placeholder="Write your code here..."
                                            onChange={(e) => setAnswer(e.target.value)}
                                            padding={15}
                                            style={{
                                                fontSize: 14,
                                                backgroundColor: "#f5f5f5",
                                                fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Consolas, Liberation Mono, Menlo, monospace',
                                                minHeight: "200px"
                                            }}
                                            disabled={loading}
                                        />
                                    </div>
                                ) : (
                                    <textarea
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        rows="6"
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Type your answer here..."
                                        disabled={loading}
                                    />
                                )}
                            </div>

                            {/* Submit button */}
                            <button
                                onClick={submitAnswer}
                                disabled={loading || !answer.trim()}
                                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Submitting...' : 'Submit Answer'}
                            </button>

                            {/* Feedback section */}
                            {interview.parsedFeedbacks?.[currentQuestionIndex] && (
                                <div className="p-6 bg-green-50 rounded-lg border border-green-100 mt-6">
                                    <h3 className="text-xl font-semibold text-green-800 mb-4">Feedback</h3>

                                    {interview.parsedFeedbacks[currentQuestionIndex].score !== null && (
                                        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                                            <div className="text-center">
                                                <span className="text-2xl font-bold text-green-600">
                                                    {interview.parsedFeedbacks[currentQuestionIndex].score}/10
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {interview.parsedFeedbacks[currentQuestionIndex].strengths?.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="font-medium text-green-700 mb-2">Strengths:</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {interview.parsedFeedbacks[currentQuestionIndex].strengths.map((s, i) => (
                                                    <li key={i} className="text-green-800">{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {interview.parsedFeedbacks[currentQuestionIndex].improvements?.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="font-medium text-amber-700 mb-2">Areas for Improvement:</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                {interview.parsedFeedbacks[currentQuestionIndex].improvements.map((imp, i) => (
                                                    <li key={i} className="text-amber-800">{imp}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {interview.parsedFeedbacks[currentQuestionIndex].feedback && (
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">Detailed Feedback:</h4>
                                            <p className="text-gray-600 bg-white p-3 rounded-lg shadow-sm">
                                                {interview.parsedFeedbacks[currentQuestionIndex].feedback}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="mb-6">
                                <svg className="w-16 h-16 text-teal-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                                <h2 className="text-xl font-semibold text-gray-700">No questions available for this interview.</h2>
                                <p className="text-gray-500 mt-2">Generate questions to start your interview session.</p>
                            </div>
                            <button
                                onClick={handleGenerateQuestions}
                                disabled={generatingQuestions}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {generatingQuestions ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating Questions...
                                    </span>
                                ) : 'Generate Questions'}
                            </button>
                            <div className="mt-4">
                                <button
                                    onClick={() => navigate('/interviews')}
                                    className="text-teal-600 hover:text-teal-800"
                                >
                                    Back to Interviews
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiInterviewPage;