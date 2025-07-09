import { useState, useCallback, useRef } from "react";
import axios from "axios";
import { auth, db } from "../firebase-config";
import { signInAnonymously, signOut } from "firebase/auth";

export default function useFirebase(setUserProfile) {
    const sessionTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);
    const [sessionExpiry, setSessionExpiry] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    const clearSessionTimers = () => {
        clearTimeout(sessionTimerRef.current);
        clearInterval(countdownTimerRef.current);
        sessionTimerRef.current = null;
        countdownTimerRef.current = null;
        setSessionExpiry(null);
        setTimeRemaining(null);
    };

    const sendTokenToBackend = async (id_token) => {
        const res = await axios.post(`${API_BASE_URL}/verify-firebase-login`, {
            token: id_token,
        });
        return res.data;
    };

    const handleGoogleSignInSuccess = useCallback(
        async (firebaseResponse) => {
            clearSessionTimers();
            setUserProfile({
                name: firebaseResponse.profile.name,
                email: firebaseResponse.profile.email,
                picture: firebaseResponse.profile.picture,
                id_token: firebaseResponse.credential,
                isAnonymous: false,
                uid: firebaseResponse.uid,
            });
            await sendTokenToBackend(firebaseResponse.credential);
        },
        [setUserProfile]
    );

    const handleLoginGuest = async () => {
        const result = await signInAnonymously(auth);
        const user = result.user;
        const idToken = await user.getIdToken();
        setUserProfile({
            name: "Khách",
            email: null,
            picture: null,
            id_token: idToken,
            isAnonymous: true,
            uid: user.uid,
        });
        await sendTokenToBackend(idToken);
        startSessionTimer();
    };

    const handleLogout = async () => {
        clearSessionTimers();
        await signOut(auth);
        setUserProfile(null);
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

    return {
        handleGoogleSignInSuccess,
        handleLoginGuest,
        handleLogout,
        sessionExpiry,
        timeRemaining,
    };
}
