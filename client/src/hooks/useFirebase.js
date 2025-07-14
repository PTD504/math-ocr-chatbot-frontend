import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app;
let auth;
let firebaseInitialized = false;

try {
    if (!firebaseInitialized) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        firebaseInitialized = true;
        console.log("Firebase client-side auth initialized successfully");
    }
} catch (error) {
    console.error("Error initializing Firebase client-side auth:", error);
    auth = null;
}

export default function useFirebase(setUserProfile) {
    const sessionTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const [sessionExpiry, setSessionExpiry] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [firebaseClientLoaded, setFirebaseClientLoaded] = useState(false);
    const [firebaseError, setFirebaseError] = useState(null);

    const API_BASE_URL = import.meta.env.PROD
        ? import.meta.env.VITE_BACKEND_URL_DOCKER || import.meta.env.VITE_BACKEND_URL
        : import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

    const clearSessionTimers = () => {
        clearTimeout(sessionTimerRef.current);
        clearInterval(countdownTimerRef.current);
        sessionTimerRef.current = null;
        countdownTimerRef.current = null;
        setSessionExpiry(null);
        setTimeRemaining(null);
    };

    const sendTokenToBackend = async (idToken) => {
        if (!API_BASE_URL) {
            console.error("Backend API URL is not defined.");
            throw new Error("Backend API URL is not defined.");
        }
        try {
            const res = await axios.post(`${API_BASE_URL}/auth/verify-token`, {
                idToken: idToken,
            });
            return res.data;
        } catch (error) {
            console.error("Error sending token to backend:", error.response?.data || error.message);
            throw new Error(`Failed to verify token with backend: ${error.response?.data?.detail || error.message}`);
        }
    };

    const handleGoogleLogin = useCallback(async () => {
        if (!auth) {
            alert("Firebase client authentication not available.");
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const idToken = await user.getIdToken();
            clearSessionTimers();

            const backendUserProfile = await sendTokenToBackend(idToken);
            setUserProfile({
                ...backendUserProfile,
                id_token: idToken,
            });
            console.log("Google sign-in successful, token sent to backend.");
            setFirebaseError(null);
        } catch (error) {
            console.error("Error with Google sign-in or backend token verification:", error);
            const errorMessage = error.message || "Unknown error during Google login.";
            alert(`Đăng nhập Google thất bại: ${errorMessage}`);
            setFirebaseError(errorMessage);
        }
    }, [setUserProfile, API_BASE_URL]);

    const handleLoginGuest = async () => {
        if (!auth) {
            alert("Firebase client authentication not available.");
            return;
        }
        try {
            const result = await signInAnonymously(auth);
            const user = result.user;
            const idToken = await user.getIdToken();
            clearSessionTimers();

            const backendUserProfile = await sendTokenToBackend(idToken);
            setUserProfile({
                ...backendUserProfile,
                id_token: idToken,
            });
            startSessionTimer();
            console.log("Anonymous sign-in successful, token sent to backend.");
            setFirebaseError(null);
        } catch (error) {
            console.error("Error with anonymous sign-in or backend token verification:", error);
            const errorMessage = error.message || "Unknown error during guest login.";
            alert(`Đăng nhập khách thất bại: ${errorMessage}`);
            setFirebaseError(errorMessage);
        }
    };

    const handleLogout = async (options = {}) => {
        const {
            skipConfirm = false
        } = options;

        if (!skipConfirm) {
            const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất?");
            if (!confirmed) return;
        }

        clearSessionTimers();
        if (auth) {
            await signOut(auth);
        }
        
        setUserProfile(null);
        setFirebaseError(null);
        console.log("User logged out.");
    };

    const startSessionTimer = () => {
        const expiryTime = Date.now() + 15 * 60 * 1000;
        setSessionExpiry(expiryTime);
        sessionTimerRef.current = setTimeout(() => {
            handleLogout({ skipConfirm: true });
            alert("Phiên khách hết hạn.");
        }, 15 * 60 * 1000);

        countdownTimerRef.current = setInterval(() => {
            const remaining = Math.max(0, expiryTime - Date.now());
            setTimeRemaining(remaining);
            if (remaining <= 0) clearInterval(countdownTimerRef.current);
        }, 1000);
    };

    useEffect(() => {
        if (!auth) {
            setFirebaseClientLoaded(true);
            setFirebaseError("Firebase authentication could not be initialized.");
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (user.isAnonymous) {
                    console.log("Firebase Auth State Changed: User is anonymous.");
                    setUserProfile(null);
                    setFirebaseClientLoaded(true);
                    return;
                }

                try {
                    const idToken = await user.getIdToken();
                    const backendUserProfile = await sendTokenToBackend(idToken);

                    setUserProfile({
                        ...backendUserProfile,
                        id_token: idToken,
                    });
                    
                    clearSessionTimers();
                    setFirebaseError(null);
                } catch (error) {
                    console.error("Error processing persisted user session:", error);
                    const errorMessage = `Lỗi xử lý phiên người dùng: ${error.message}`;
                    setFirebaseError(errorMessage);
                    setUserProfile(null); 
                    clearSessionTimers(); 
                    signOut(auth); // Force sign out if there's a backend verification error
                }
            } else {
                console.log("Firebase Auth State Changed: User signed out or no user.");
                setUserProfile(null);
                clearSessionTimers();
                setFirebaseError(null);
            }
            setFirebaseClientLoaded(true);
        });

        return () => unsubscribe();
    }, [setUserProfile, API_BASE_URL]);

    return {
        handleGoogleLogin,
        handleLoginGuest,
        handleLogout,
        sessionExpiry,
        timeRemaining,
        firebaseClientLoaded,
        firebaseError,
    };
}