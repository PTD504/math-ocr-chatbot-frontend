import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDds5hH2SP8CaGnFQbxy6oARl7N4LShjLY",
    authDomain: "math-recognizer-chatbot.firebaseapp.com",
    projectId: "math-recognizer-chatbot",
    storageBucket: "math-recognizer-chatbot.firebasestorage.app",
    messagingSenderId: "582728697481",
    appId: "1:582728697481:web:06941d87117a7e4bfc2858"
};

let app;
let auth;
let db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    // Fallback values
    auth = null;
    db = null;
}

export { auth, db };