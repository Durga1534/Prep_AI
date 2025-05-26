import {useState} from 'react'
import {useNavigate} from "react-router-dom";
import {auth} from '../firebase/db.js';
import axios from "axios";
import {toast} from "react-hot-toast";

const StartInterview = () => {
    const [formData, setFormData] = useState({
        role: '',
        experience: '',
        skills: [],
        duration: 30
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const skillsOptions = [
        'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'Ruby', 'PHP',
        'SQL', 'MongoDB', 'Express', 'Data Structures', 'Algorithms', 'System Design',
        'HTML', 'CSS', 'Git', 'GitHub', 'Heroku', 'Firebase', 'Jest', 'Tailwind CSS',
    ];

    const handleSubmit = async(e) => {
        e.preventDefault();

        if (!formData.role || !formData.experience || formData.skills.length === 0) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            setLoading(true);
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                toast.error("Please login first");
                navigate('/login');
                return;
            }

            // Updated to use controller endpoint for creating interview
            const response = await axios.post("/api/auth/interview", {
                ...formData,
                // Convert experience to number if needed
                experience: typeof formData.experience === 'string' ?
                    (formData.experience.includes('-') ?
                        parseInt(formData.experience.split('-')[1]) :
                        parseInt(formData.experience.replace('+', '')))
                    : formData.experience,
                status: 'created'
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            toast.success("Interview created successfully!");
            navigate(`/ai-interview/${response.data.id}`);
        } catch(err) {
            console.error('Error creating interview:', err);
            toast.error(err.response?.data?.error || "Failed to start interview");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-teal-50 py-12 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6">
                <h1 className="text-2xl font-bold text-teal-800 mb-6">New Interview</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-teal-700 mb-2">Role *</label>
                        <input
                            type="text"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            placeholder="e.g. Frontend Developer"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-teal-700 mb-2">Experience Level *</label>
                        <select
                            value={formData.experience}
                            onChange={(e) => setFormData({...formData, experience: e.target.value})}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            required
                        >
                            <option value="">Select Experience Level</option>
                            <option value="0-2">0-2 years</option>
                            <option value="3-5">3-5 years</option>
                            <option value="5+">5+ years</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-teal-700 mb-2">Skills * (Select at least one)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                            {skillsOptions.map(skill => (
                                <label key={skill} className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.skills.includes(skill)}
                                        onChange={(e) => {
                                            const newSkills = e.target.checked
                                                ? [...formData.skills, skill]
                                                : formData.skills.filter(s => s !== skill);
                                            setFormData({...formData, skills: newSkills});
                                        }}
                                        className="form-checkbox text-teal-600"
                                    />
                                    <span className="ml-2 text-sm">{skill}</span>
                                </label>
                            ))}
                        </div>
                        {formData.skills.length > 0 && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">Selected skills:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {formData.skills.map(skill => (
                                        <span key={skill} className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-teal-700 mb-2">Duration (minutes)</label>
                        <select
                            value={formData.duration}
                            onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || formData.skills.length === 0}
                        className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating Interview...' : 'Start Interview'}
                    </button>
                </form>
            </div>
        </div>
    )
}
export default StartInterview