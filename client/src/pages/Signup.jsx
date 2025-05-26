import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { auth } from '../firebase/db.js';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:8080',
    withCredentials: true
});

const Signup = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);

        const signupPromise = new Promise(async (resolve, reject) => {
            try {
                // Create Firebase user
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Update display name
                await updateProfile(user, { displayName: name });

                // Get the ID token
                const token = await user.getIdToken();

                // Register user in backend
                await axiosInstance.post('/api/auth/signup',
                    { email, name },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );

                resolve('Account created successfully!');
                setTimeout(() => {
                    navigate('/login');
                }, 2000); // Navigate after 2 seconds
            } catch (error) {
                console.error('Signup error:', error);
                let errorMessage = 'Failed to create account';

                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Email is already registered';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Password is too weak';
                        break;
                    default:
                        errorMessage = error.response?.data?.error || error.message;
                }
                reject(errorMessage);
            }
        });

        toast.promise(signupPromise, {
            loading: 'Creating account...',
            success: (message) => message,
            error: (err) => err,
        });

        signupPromise.finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-white px-4">
            <Toaster position="top-center" reverseOrder={false} />
            <form
                onSubmit={handleSignup}
                className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md"
            >
                <h2 className="text-2xl font-bold mb-4 text-center">Sign Up</h2>
                <input
                    type="text"
                    placeholder="Enter your name here"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 mb-4 border rounded-md"
                    required
                />
                <input
                    type="email"
                    placeholder="Enter your email here"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 mb-4 border rounded-md"
                    required
                />
                <input
                    type="password"
                    placeholder="Enter your password here"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 mb-4 border rounded-md"
                    required
                    minLength="6"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                <p className="mt-4 text-center text-sm">
                    Already have an account?{" "}
                    <span
                        className="text-teal-600 cursor-pointer hover:underline"
                        onClick={() => navigate("/login")}
                    >
                        Login
                    </span>
                </p>
            </form>
        </div>
    );
};

export default Signup;