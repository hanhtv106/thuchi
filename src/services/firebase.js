// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyC1WSHkwlCLtdVB6wBt0A82cxCL-LVFTBc",
    authDomain: "thuchi-48f4f.firebaseapp.com",
    projectId: "thuchi-48f4f",
    storageBucket: "thuchi-48f4f.firebasestorage.app",
    messagingSenderId: "271976070463",
    appId: "1:271976070463:web:8c4b0655f869f39bfba78a",
    measurementId: "G-SYHHPMXNZ4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };
