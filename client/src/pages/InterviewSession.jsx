import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/db';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const InterviewSession = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [answeredIndices, setAnsweredIndices] = useState(new Set());
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        fetchInterviewDetails();
    }, [id]);

    useEffect(() => {
        // Load saved answer for the current question
        setAnswer(answers[currentQuestionIndex] || '');
    }, [currentQuestionIndex]);

    const fetchInterviewDetails = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/auth/interview/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const interviewData = response.data;
            setInterview(interviewData);

            // Load existing answers if any
            if (interviewData.answers) {
                const initialAnswers = {};
                const answered = new Set();

                interviewData.answers.forEach((item) => {
                    initialAnswers[item.questionIndex] = item.answer;
                    answered.add(item.questionIndex);
                });

                setAnswers(initialAnswers);
                setAnsweredIndices(answered);
            }

            // If interview already completed
            if (interviewData.status === 'completed') {
                setIsCompleted(true);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching interview:', error);
            toast.error('Failed to load interview');
            navigate('/interviews');
        }
    };

    const handleSubmitAnswer = async () => {
        if (!answer.trim()) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/interview/${id}/answers`, {
                questionIndex: currentQuestionIndex,
                answer: answer
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAnsweredIndices(prev => new Set(prev).add(currentQuestionIndex));
            setAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
            setAnswer('');

            const isLastQuestion = currentQuestionIndex === interview.questions.length - 1;
            if (isLastQuestion || response.data.isComplete) {
                setIsCompleted(true);
                toast.success('Interview completed successfully!');
            } else {
                setCurrentQuestionIndex(prev => prev + 1);
                toast.success('Answer submitted successfully');
            }

        } catch (error) {
            console.error('Submit answer error:', error);
            toast.error('Failed to submit answer');
        }
    };

    const handleGenerateQuestions = () => {
        // Redirect to the AI Interview page for question generation
        navigate(`/ai-interview/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    if (!interview || !interview.questions || interview.questions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-700">No questions available</h2>
                    <div className="mt-6 space-y-4">
                        <button
                            onClick={handleGenerateQuestions}
                            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                        >
                            Generate Questions
                        </button>
                        <div>
                            <button
                                onClick={() => navigate('/interviews')}
                                className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Back to Interviews
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-md p-6 text-center">
                        <div className="mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-green-600 mb-2">Interview Completed!</h1>
                            <p className="text-gray-600 text-lg">
                                You have successfully completed the {interview.role} interview.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-gray-700">
                                <strong>Questions Answered:</strong> {interview.questions.length} / {interview.questions.length}
                            </p>
                            <p className="text-gray-700">
                                <strong>Status:</strong> <span className="text-green-600 font-semibold">Completed</span>
                            </p>
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={() => navigate('/interviews')}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                            >
                                View All Interviews
                            </button>
                            <button
                                onClick={() => navigate(`/history/${id}`)}
                                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
                            >
                                View Results
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isAnswered = answeredIndices.has(currentQuestionIndex);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-md p-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-teal-800">{interview.role} Interview</h1>
                        <p className="text-gray-600">Question {currentQuestionIndex + 1} of {interview.questions.length}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((currentQuestionIndex + 1) / interview.questions.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Question */}
                    <div className="mb-6">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <h2 className="text-lg font-medium text-gray-800 mb-2">Question:</h2>
                            <p className="text-gray-700">{interview.questions[currentQuestionIndex]}</p>
                        </div>
                    </div>

                    {/* Answer Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer:</label>
                        <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            rows="6"
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="Type your answer here..."
                            disabled={isAnswered}
                        />
                        {isAnswered && (
                            <p className="text-sm text-green-600 mt-2">Answer already submitted for this question.</p>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={handleSubmitAnswer}
                            disabled={!answer.trim() || isAnswered}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                        >
                            {currentQuestionIndex === interview.questions.length - 1 ? 'Finish Interview' : 'Submit Answer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewSession;
