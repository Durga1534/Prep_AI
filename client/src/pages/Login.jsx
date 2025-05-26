import { useState } from 'react';
import { auth } from "../firebase/db.js";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const loginPromise = new Promise(async (resolve, reject) => {
            try {
                const credential = await signInWithEmailAndPassword(auth, email, password);
                console.log("User Logged in:", credential.user);
                resolve('Logged in successfully!');
                setTimeout(() => {
                    navigate("/");
                }, 1000);
            } catch (error) {
                console.error('Login error:', error);
                let errorMessage = 'Failed to login';

                switch (error.code) {
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email address';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'This account has been disabled';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Invalid password';
                        break;
                    default:
                        errorMessage = error.message;
                }
                reject(errorMessage);
            }
        });

        toast.promise(loginPromise, {
            loading: 'Logging in...',
            success: (message) => message,
            error: (err) => err,
        });

        loginPromise.finally(() => {
            setLoading(false);
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
            <Toaster position="top-center" reverseOrder={false} />
            <form
                onSubmit={handleLogin}
                className="w-full max-w-sm p-6 bg-white rounded-lg shadow-md"
            >
                <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
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
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-teal-600 text-white py-2 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
                <p className="mt-4 text-center text-sm">
                    Don't have an account?{" "}
                    <span
                        className="text-teal-600 cursor-pointer hover:underline"
                        onClick={() => navigate("/signup")}
                    >
                        Sign Up
                    </span>
                </p>
            </form>
        </div>
    );
};

export default Login;