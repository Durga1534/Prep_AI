import React, { useState, useEffect } from "react";
import { FaLaptopCode, FaDatabase, FaBrain, FaTools, FaUndo, FaHistory } from "react-icons/fa";
import { skillsWithIcons } from "../constants/skillsWithIcons";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/db.js";
import AddInterviewModal from "../components/AddInterviewModal";
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';

const Interviews = () => {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchInterviews();
        // eslint-disable-next-line
    }, []);

    const fetchInterviews = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                navigate('/login');
                return;
            }
            // Use controller endpoint
            const response = await axios.get("/api/auth/interview", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInterviews(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching interviews:', err);
            toast.error('Failed to load interviews');
            setLoading(false);
        }
    };

    const resetInterview = async (interviewId) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            // Use controller endpoint for reset
            await axios.post(`/api/auth/interview/${interviewId}/reset`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Interview reset successfully');
            await fetchInterviews();
        } catch (err) {
            console.error('Error resetting interview:', err);
            toast.error('Failed to reset interview');
        }
    };

    const handleAddInterview = async (interviewData) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                navigate('/login');
                return;
            }
            // Use controller endpoint for creating interview
            await axios.post("/api/auth/interview", {
                ...interviewData,
                experience: typeof interviewData.experience === 'string' ?
                    (interviewData.experience.includes('-') ?
                        parseInt(interviewData.experience.split('-')[1]) :
                        parseInt(interviewData.experience.replace('+', '')))
                    : interviewData.experience,
                status: 'created'
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            await fetchInterviews();
            setIsModalOpen(false);
            toast.success('Interview created successfully');
        } catch (err) {
            console.error('Error adding interview:', err);
            toast.error(err.response?.data?.error || 'Failed to add interview');
        }
    };

    const getIcon = (role) => {
        switch (role.toLowerCase()) {
            case 'frontend developer':
                return <FaLaptopCode size={24} className="text-teal-600" />;
            case 'backend developer':
                return <FaDatabase size={24} className="text-teal-600" />;
            case 'data scientist':
                return <FaBrain size={24} className="text-teal-600" />;
            case 'devops engineer':
                return <FaTools size={24} className="text-teal-600" />;
            default:
                return <FaLaptopCode size={24} className="text-teal-600" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    const inProgressInterviews = interviews.filter(interview =>
        interview.status === 'created' || interview.status === 'in-progress'
    );
    const completedCount = interviews.filter(interview => 
        interview.status === 'completed'
    ).length;

    const InterviewCard = ({ interview }) => (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
            <div className="flex items-center gap-3 mb-4">
                {getIcon(interview.role)}
                <h3 className="text-xl font-semibold text-teal-800">
                    {interview.role}
                </h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
                Experience: {interview.experience} years
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
                {interview.skills?.map((skill) => (
                    <span
                        key={skill}
                        className="flex items-center gap-1 bg-teal-50 text-teal-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                        {skillsWithIcons[skill] && React.createElement(skillsWithIcons[skill], { className: "text-[16px]" })}
                        {skill}
                    </span>
                ))}
            </div>

            <div className="text-sm text-gray-600 mb-4">
                <div>Status: <span className="capitalize font-medium">{interview.status}</span></div>
                {interview.questions?.length > 0 && (
                    <div>Questions: {interview.questions.length}</div>
                )}
                {interview.answers?.length > 0 && (
                    <div>Answered: {interview.answers.filter(a => a).length}/{interview.questions?.length || 0}</div>
                )}
            </div>

            <div className="flex justify-between gap-4 mt-4">
                <button
                    onClick={() => navigate(`/interview/${interview.id}`)}
                    className="flex-1 bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition"
                >
                    {interview.status === 'created' ? 'Start Interview' : 'Continue Interview'}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        resetInterview(interview.id);
                    }}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition"
                >
                    <FaUndo /> Reset
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <Toaster />
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-teal-700">My Interviews</h1>
                    <div className="flex gap-4">
                        {completedCount > 0 && (
                            <button
                                onClick={() => navigate('/history')}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-800 rounded-lg hover:bg-teal-200 transition"
                            >
                                <FaHistory /> View History ({completedCount})
                            </button>
                        )}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition"
                        >
                            + New Interview
                        </button>
                    </div>
                </div>

                <AddInterviewModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleAddInterview}
                />

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {inProgressInterviews.length > 0 ? (
                        inProgressInterviews.map(interview => (
                            <InterviewCard key={interview.id} interview={interview} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <div className="bg-white rounded-xl shadow-md p-8">
                                <h2 className="text-xl font-semibold text-gray-700 mb-4">No interviews in progress</h2>
                                <p className="text-gray-500 mb-6">Create a new interview to get started</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                                >
                                    + New Interview
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default Interviews;