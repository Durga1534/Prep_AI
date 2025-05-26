// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDwfHD8Mv-z7ffljwE9N9UcMCVe2zWSpG8",
    authDomain: "prep-ai-c8131.firebaseapp.com",
    projectId: "prep-ai-c8131",
    storageBucket: "prep-ai-c8131.firebasestorage.app",
    messagingSenderId: "835809913249",
    appId: "1:835809913249:web:ad30248f0656f689c8c3e0",
    measurementId: "G-588B5SZY1B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export {auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut };