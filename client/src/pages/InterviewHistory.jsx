import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaEye, FaCheckCircle, FaRedo } from 'react-icons/fa';
import { auth } from '../firebase/db.js';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="text-center py-8 text-red-600">
                    Something went wrong. Please try refreshing the page.
                </div>
            );
        }
        return this.props.children;
    }
}

const formatCodeInAnswer = (answer) => {
    if (!answer) return null;

    // Handle objects with text and type properties
    if (typeof answer === 'object' && answer !== null) {
        try {
            // If it has a text property, use that
            if (answer.text && typeof answer.text === 'string') {
                return <p className="whitespace-pre-line">{answer.text}</p>;
            }

            // If it's an array, handle each element
            if (Array.isArray(answer)) {
                return (
                    <div>
                        {answer.map((item, index) => (
                            <div key={index} className="mb-2">
                                {typeof item === 'object' && item !== null && item.text
                                    ? item.text
                                    : String(item)
                                }
                            </div>
                        ))}
                    </div>
                );
            }

            // For other objects, try to stringify them
            return <pre className="whitespace-pre-line">{JSON.stringify(answer, null, 2)}</pre>;
        } catch (e) {
            console.error('Error formatting answer:', e);
            return <p className="text-red-600">Error displaying answer</p>;
        }
    }

    // Convert to string for processing
    const answerStr = String(answer);

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    if (!codeBlockRegex.test(answerStr)) {
        return <p className="whitespace-pre-line">{answerStr}</p>;
    }

    const parts = [];
    let lastIndex = 0;
    let match;
    codeBlockRegex.lastIndex = 0;

    while ((match = codeBlockRegex.exec(answerStr)) !== null) {
        if (match.index > lastIndex) {
            parts.push(
                <p key={`text-${lastIndex}`} className="whitespace-pre-line mb-4">
                    {answerStr.slice(lastIndex, match.index)}
                </p>
            );
        }
        const language = match[1] || 'javascript';
        parts.push(
            <div key={`code-${match.index}`} className="mb-4 rounded-lg overflow-hidden">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0 }}
                >
                    {match[2].trim()}
                </SyntaxHighlighter>
            </div>
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < answerStr.length) {
        parts.push(
            <p key={`text-${lastIndex}`} className="whitespace-pre-line">
                {answerStr.slice(lastIndex)}
            </p>
        );
    }

    return <div>{parts}</div>;
};

const FeedbackSection = React.memo(({ feedback }) => {
    if (!feedback) {
        return (
            <div className="text-center py-8 text-gray-500">
                No feedback available for this question.
            </div>
        );
    }

    let parsedFeedback = feedback;
    if (typeof feedback === 'string') {
        try {
            parsedFeedback = JSON.parse(feedback);
        } catch (e) {
            return (
                <div className="bg-gray-50 rounded-lg p-6 shadow-md">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {feedback}
                    </p>
                </div>
            );
        }
    }

    return (
        <div className="space-y-6">
            {parsedFeedback.score != null && (
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl p-6 shadow-lg">
                    <h3 className="text-lg font-medium mb-2 text-center">Overall Score</h3>
                    <div className="text-5xl font-bold text-center">{parsedFeedback.score}/10</div>
                </div>
            )}

            {Array.isArray(parsedFeedback.strengths) && parsedFeedback.strengths.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-6 shadow-lg border border-emerald-100">
                    <h3 className="text-lg font-medium text-emerald-800 mb-4 flex items-center">
                        <FaCheckCircle className="mr-2" />
                        Strengths
                    </h3>
                    <div className="grid gap-4">
                        {parsedFeedback.strengths.map((strength, idx) => (
                            <div
                                key={idx}
                                className="bg-emerald-100/50 rounded-lg p-4 text-emerald-700 flex items-start gap-3"
                            >
                                <span className="mt-1.5 text-xs">•</span>
                                <span className="flex-1">
                                    {typeof strength === 'object' && strength !== null
                                        ? (strength.text || JSON.stringify(strength) || '')
                                        : String(strength)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {Array.isArray(parsedFeedback.improvements) && parsedFeedback.improvements.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-6 shadow-lg border border-amber-100">
                    <h3 className="text-lg font-medium text-amber-800 mb-4 flex items-center">
                        <FaArrowRight className="mr-2" />
                        Areas for Improvement
                    </h3>
                    <div className="grid gap-4">
                        {parsedFeedback.improvements.map((improvement, idx) => (
                            <div
                                key={idx}
                                className="bg-amber-100/50 rounded-lg p-4 text-amber-700 flex items-start gap-3"
                            >
                                <span className="mt-1.5 text-xs">•</span>
                                <span className="flex-1">
                                    {typeof improvement === 'object' && improvement !== null
                                        ? (improvement.text || JSON.stringify(improvement) || '')
                                        : String(improvement)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {parsedFeedback.feedback && (
                <div className="bg-gray-50 rounded-xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                        <FaEye className="mr-2" />
                        Detailed Feedback
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {parsedFeedback.feedback}
                    </p>
                </div>
            )}
        </div>
    );
});

const InterviewDetail = React.memo(({ id }) => {
    const [interview, setInterview] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [resetting, setResetting] = useState(false);
    const navigate = useNavigate();

    const fetchInterviewDetail = useCallback(async () => {
        try {
            setLoading(true);
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(
                `http://localhost:8080/api/auth/interview/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const transformedData = {
                ...response.data,
                parsedFeedbacks: [],
                questions: response.data.questions || [],
                answers: response.data.answers || []
            };

            // Handle different feedback formats
            const feedbacks = response.data.feedback || response.data.feedbacks || [];
            transformedData.parsedFeedbacks = (Array.isArray(feedbacks) ? feedbacks : Object.values(feedbacks))
                .map(feedback => {
                    if (typeof feedback === 'string') {
                        try {
                            return JSON.parse(feedback);
                        } catch (e) {
                            return { feedback };
                        }
                    }
                    return feedback;
                });

            console.log('Transformed Interview Data:', transformedData);
            setInterview(transformedData);
        } catch (error) {
            console.error("Error fetching interview:", error);
            setError(error.message || 'Failed to fetch interview details');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchInterviewDetail();
    }, [fetchInterviewDetail]);

    const handleReset = useCallback(async () => {
        try {
            setResetting(true);
            const token = await auth.currentUser?.getIdToken();
            await axios.post(
                `http://localhost:8080/api/auth/interview/${id}/reset`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            await fetchInterviewDetail();
            setCurrentQuestionIndex(0);
        } catch (error) {
            setError('Failed to reset interview');
        } finally {
            setResetting(false);
        }
    }, [id, fetchInterviewDetail]);

    const handleQuestionChange = useCallback((direction) => {
        setCurrentQuestionIndex((i) =>
            Math.max(0, Math.min(interview?.questions.length - 1 || 0, i + direction))
        );
    }, [interview?.questions.length]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="text-red-800 font-semibold">Error</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!interview) return <div>No interview data found.</div>;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/history')}
                        className="flex items-center gap-2 text-teal-600 hover:text-teal-700"
                    >
                        <FaArrowLeft /> Back to History
                    </button>
                    <h1 className="text-3xl font-bold text-teal-700">Interview Review</h1>
                    <button
                        onClick={handleReset}
                        disabled={resetting}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200 disabled:opacity-50"
                    >
                        <FaRedo /> {resetting ? 'Resetting...' : 'Reset Interview'}
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-teal-800">Q&A Session</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleQuestionChange(-1)}
                                    disabled={currentQuestionIndex === 0}
                                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                                >
                                    <FaArrowLeft />
                                </button>
                                <span className="px-3 text-sm font-medium text-gray-600">
                                    {currentQuestionIndex + 1} / {interview.questions.length}
                                </span>
                                <button
                                    onClick={() => handleQuestionChange(1)}
                                    disabled={currentQuestionIndex === interview.questions.length - 1}
                                    className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                                >
                                    <FaArrowRight />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">Question {currentQuestionIndex + 1}</h3>
                                <p>{interview.questions[currentQuestionIndex]}</p>
                            </div>
                            <div className="bg-teal-50 p-4 rounded-lg">
                                <h3 className="font-semibold mb-2">Your Answer</h3>
                                {formatCodeInAnswer(interview.answers[currentQuestionIndex])}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-semibold text-teal-800 mb-6">
                            Feedback & Evaluation
                        </h2>
                        <FeedbackSection feedback={interview.parsedFeedbacks[currentQuestionIndex]} />
                    </div>
                </div>
            </div>
        </div>
    );
});

const InterviewList = React.memo(() => {
    const [completedInterviews, setCompletedInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchCompletedInterviews = useCallback(async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await axios.get(
                "http://localhost:8080/api/auth/interview",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const completed = response.data.filter(interview => interview.status === 'completed');
            setCompletedInterviews(completed);
        } catch (error) {
            console.error('Error fetching interviews:', error);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchCompletedInterviews();
    }, [fetchCompletedInterviews]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-teal-700 mb-8">Interview History</h1>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {completedInterviews.map((interview) => (
                        <div
                            key={interview.id}
                            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-teal-800">
                                    {interview.role}
                                </h2>
                                <FaCheckCircle className="text-teal-600 text-xl" />
                            </div>
                            <div className="space-y-3 mb-4">
                                <div className="text-sm">
                                    <span className="font-medium">Experience:</span>{' '}
                                    {interview.experience} years
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium">Questions Answered:</span>{' '}
                                    {interview.questions?.length || 0}
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/history/${interview.id}`)}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-teal-100 text-teal-800 rounded-lg font-medium hover:bg-teal-200 transition"
                            >
                                <FaEye className="text-[16px]" />
                                View Full Interview
                            </button>
                        </div>
                    ))}
                    {completedInterviews.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <p className="text-gray-600">No completed interviews yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

const InterviewHistory = () => {
    const { id } = useParams();
    return (
        <ErrorBoundary>
            <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
                </div>
            }>
                {id ? <InterviewDetail id={id} /> : <InterviewList />}
            </Suspense>
        </ErrorBoundary>
    );
};

export default InterviewHistory;