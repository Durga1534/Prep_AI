import { useState, useEffect } from 'react';
import { FiMenu, FiX, FiUser, FiSettings, FiLogOut } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth, signOut } from "../firebase/db.js";
import { onAuthStateChanged } from 'firebase/auth';

const navLinks = [
    { to: "/", label: "Home" },
    { to: "/interviews", label: "Interview" },
    { to: "/history", label: "History" }
];

const SESSION_TIMEOUT = 60 * 60 * 1000;

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [lastActive, setLastActive] = useState(Date.now());
    const { pathname } = useLocation();
    const navigate = useNavigate();

    //Track user activity
    useEffect(() => {
        const updateActivity = () => setLastActive(Date.now());
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
        };
    }, []);

    //check for session timeout
    useEffect(() => {
        if(!user) return;

        const checkSession = setInterval(() => {
            if(Date.now() - lastActive > SESSION_TIMEOUT) {
                handleSignOut();
                alert('Your session has expired due to inactivity. Please log in again.');
            }
        }, 30000); //check every 30 seconds

        return () => clearInterval(checkSession);
    }, [user, lastActive]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // Use Firebase user properties directly
                setUser({
                    email: currentUser.email,
                    displayName: currentUser.displayName || currentUser.email.split('@')[0]
                });
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const toggle = () => setIsOpen(!isOpen);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setDropdownOpen(false);
            setUser(null);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const linkClass = (to) =>
        `px-2 py-1 rounded transition ${
            pathname === to
                ? "bg-teal-800 text-teal-100"
                : "hover:bg-teal-500 hover:text-white"
        }`;

    return (
        <nav className="bg-teal-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex items-center h-16">
                    <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 flex-shrink-0 text-xl font-bold">
                        Prep AI
                    </div>
                    <div className="hidden md:flex space-x-6 ml-auto items-center">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={linkClass(link.to)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center space-x-2 px-3 py-2 rounded hover:bg-teal-700"
                                >
                                    <div className="w-8 h-8 bg-teal-800 rounded-full flex items-center justify-center">
                                        {user.displayName[0].toUpperCase()}
                                    </div>
                                    <span className="ml-2">{user.displayName}</span>
                                </button>
                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-gray-700">
                                        <div className="px-4 py-2 text-sm border-b border-gray-200">
                                            <span className="font-medium">{user.displayName}</span>
                                            <br />
                                            <span className="text-gray-500">{user.email}</span>
                                        </div>
                                        <button
                                            onClick={handleSignOut}
                                            className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                                        >
                                            <FiLogOut className="mr-2" />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => navigate('/signup')}
                                className="px-4 py-2 rounded-md bg-teal-700 hover:bg-teal-800"
                            >
                                Sign Up
                            </button>
                        )}
                    </div>
                    <div className="flex md:hidden ml-auto">
                        <button onClick={toggle} className="focus:outline-none">
                            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                        </button>
                    </div>
                </div>
            </div>
            {isOpen && (
                <div className="md:hidden bg-teal-700 px-4 pb-4 space-y-2">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={linkClass(link.to) + " block"}
                            onClick={toggle}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {user && (
                        <div className="py-2 px-2 border-t border-teal-600">
                            <div className="text-sm mb-2">{user.displayName}</div>
                            <div className="text-sm text-teal-200 mb-2">{user.email}</div>
                        </div>
                    )}
                    {user ? (
                        <>
                            <Link
                                to="/settings"
                                className="block px-2 py-1 hover:bg-teal-500"
                                onClick={toggle}
                            >
                                Settings
                            </Link>
                            <button
                                onClick={() => {
                                    handleSignOut();
                                    toggle();
                                }}
                                className="block w-full text-left px-2 py-1 hover:bg-teal-500"
                            >
                                Sign out
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/signup"
                            className="block px-2 py-1 hover:bg-teal-500"
                            onClick={toggle}
                        >
                            Sign Up
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;