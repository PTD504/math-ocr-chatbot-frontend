// client/src/hooks/useFirebase.js
import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase client config (PUBLIC - safe to keep on frontend)
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
let firebaseInitialized = false; // Flag to ensure single initialization

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
    // We should also set a state for this error
}

export default function useFirebase(setUserProfile) {
    const sessionTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const [sessionExpiry, setSessionExpiry] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [firebaseClientLoaded, setFirebaseClientLoaded] = useState(false); // Start as false
    const [firebaseError, setFirebaseError] = useState(null); // Add firebaseError state

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
            setFirebaseError(null); // Clear any previous errors on successful login
        } catch (error) {
            console.error("Error with Google sign-in or backend token verification:", error);
            const errorMessage = error.message || "Unknown error during Google login.";
            alert(`Đăng nhập Google thất bại: ${errorMessage}`);
            setFirebaseError(errorMessage); // Set error state
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
            setFirebaseError(null); // Clear any previous errors on successful login
        } catch (error) {
            console.error("Error with anonymous sign-in or backend token verification:", error);
            const errorMessage = error.message || "Unknown error during guest login.";
            alert(`Đăng nhập khách thất bại: ${errorMessage}`);
            setFirebaseError(errorMessage); // Set error state
        }
    };

    const handleLogout = async () => {
        clearSessionTimers();
        if (auth) {
            await signOut(auth);
        }
        setUserProfile(null); // Explicitly set to null on logout
        setFirebaseError(null); // Clear any errors
        console.log("User logged out.");
    };

    const startSessionTimer = () => {
        const expiryTime = Date.now() + 15 * 60 * 1000;
        setSessionExpiry(expiryTime);
        sessionTimerRef.current = setTimeout(() => {
            handleLogout();
            alert("Phiên khách hết hạn.");
        }, 15 * 60 * 1000);

        countdownTimerRef.current = setInterval(() => {
            const remaining = Math.max(0, expiryTime - Date.now());
            setTimeRemaining(remaining);
            if (remaining <= 0) clearInterval(countdownTimerRef.current);
        }, 1000);
    };

    // THIS IS THE CRUCIAL EFFECT TO LISTEN FOR AUTH STATE CHANGES
    useEffect(() => {
        if (!auth) {
            setFirebaseClientLoaded(true); // Still set loaded to true even if auth failed, to allow showing error
            setFirebaseError("Firebase authentication could not be initialized.");
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // User is signed in (either new login or persisted session)
                    const idToken = await user.getIdToken();
                    // Send token to backend to get the full user profile or verify
                    const backendUserProfile = await sendTokenToBackend(idToken);
                    setUserProfile({
                        ...backendUserProfile,
                        id_token: idToken,
                    });
                    if (user.isAnonymous) {
                        startSessionTimer(); // Restart timer for anonymous users if session persists
                    } else {
                        clearSessionTimers(); // Clear any guest timers for authenticated users
                    }
                    setFirebaseError(null); // Clear any errors on successful auth state change
                } catch (error) {
                    console.error("Error processing persisted user session:", error);
                    const errorMessage = `Lỗi xử lý phiên người dùng: ${error.message}`;
                    setFirebaseError(errorMessage);
                    setUserProfile(null); // Ensure user is null on error
                    clearSessionTimers(); // Clear timers on error
                    signOut(auth); // Force sign out if there's a backend verification error
                }
            } else {
                // User is signed out or no user is signed in
                console.log("Firebase Auth State Changed: User signed out or no user.");
                setUserProfile(null); // Explicitly set to null
                clearSessionTimers();
                setFirebaseError(null); // Clear errors when logged out
            }
            setFirebaseClientLoaded(true); // Firebase auth state is now known
        });

        // Cleanup the subscription on unmount
        return () => unsubscribe();
    }, [setUserProfile, API_BASE_URL]); // Add setUserProfile and API_BASE_URL to dependencies

    return {
        handleGoogleLogin,
        handleLoginGuest,
        handleLogout,
        sessionExpiry,
        timeRemaining,
        firebaseClientLoaded,
        firebaseError, // Expose firebaseError
    };
}