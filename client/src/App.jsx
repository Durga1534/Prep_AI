import React from 'react';
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import axios from 'axios';
import Navbar from "./components/Navbar.jsx";
import Homepage from "./pages/Homepage.jsx"
import Interviews from "./pages/Interviews.jsx";
import AiInterviewPage from "./pages/AiInterviewPage.jsx";
import InterviewHistory from "./pages/InterviewHistory.jsx";
import InterviewSession from "./pages/InterviewSession.jsx";
import StartInterview from "./pages/StartInterview.jsx";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import 'react-toastify/dist/ReactToastify.css';


axios.defaults.baseURL = 'https://prep-ai-wku0.onrender.com';
axios.defaults.withCredentials = true;

const App = () => {
    const location = useLocation();
    const hideNavbar = ["/signup", "/login"].includes(location.pathname);

    return (
        <>
            {!hideNavbar && <Navbar />}
            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/interviews" element={<Interviews />} />
                <Route path="/start-interview" element={<StartInterview />} />
                <Route path="/interview/:id" element={<InterviewSession />} />
                <Route path="/ai-interview/:id" element={<AiInterviewPage />} />
                <Route path="/history" element={<InterviewHistory />} />
                <Route path="/history/:id" element={<InterviewHistory />} />
                <Route path="/feedback/:id" element={<InterviewHistory />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
            </Routes>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </>
    );
};

export default App;
