import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const AddInterviewModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        role: '',
        experience: '',
        skills: [],
    });
    const [skillInput, setSkillInput] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                role: '',
                experience: '',
                skills: [],
            });
            setSkillInput('');
        }
    }, [isOpen]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleAddSkill = () => {
        const trimmedSkill = skillInput.trim();
        if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
            setFormData({
                ...formData,
                skills: [...formData.skills, trimmedSkill]
            });
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setFormData({
            ...formData,
            skills: formData.skills.filter(skill => skill !== skillToRemove)
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Convert experience to number if it's a string
        const interview = {
            ...formData,
            experience: parseInt(formData.experience) || 0,
            status: 'created'
        };
        onSubmit(interview);
        setFormData({
            role: '',
            experience: '',
            skills: []
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-teal-800">Add New Interview</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                        type="button"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Role
                            </label>
                            <input
                                type="text"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Experience (years)
                            </label>
                            <input
                                type="number"
                                name="experience"
                                min="0"
                                value={formData.experience}
                                onChange={handleChange}
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Skills
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSkill}
                                    disabled={!skillInput.trim() || formData.skills.includes(skillInput.trim())}
                                    className={`px-4 py-2 rounded-md text-white ${
                                        !skillInput.trim() || formData.skills.includes(skillInput.trim())
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-teal-600 hover:bg-teal-700'
                                    }`}
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {formData.skills.map((skill) => (
                                    <span
                                        key={skill}
                                        className="flex items-center gap-1 bg-teal-50 text-teal-800 px-3 py-1 rounded-full text-sm font-medium"
                                    >
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="text-teal-600 hover:text-teal-800"
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            type="submit"
                            className="w-full bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition"
                            disabled={formData.skills.length === 0}
                        >
                            Add Interview
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddInterviewModal;
