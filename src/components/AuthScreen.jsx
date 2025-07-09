import React, { useEffect, useState } from 'react';

// Conditional Firebase imports with error handling
let GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, auth;

const AuthScreen = ({ onLoginGuest, onGoogleSignInSuccess, firebaseAvailable = true }) => {
    const [firebaseLoaded, setFirebaseLoaded] = useState(false);
    const [firebaseError, setFirebaseError] = useState(null);

    // Load Firebase modules dynamically
    useEffect(() => {
        const loadFirebase = async () => {
            try {
                // Try to load Firebase modules
                const firebaseAuth = await import("firebase/auth");
                const firebaseConfig = await import('../firebase-config');
                
                GoogleAuthProvider = firebaseAuth.GoogleAuthProvider;
                signInWithPopup = firebaseAuth.signInWithPopup;
                signInAnonymously = firebaseAuth.signInAnonymously;
                onAuthStateChanged = firebaseAuth.onAuthStateChanged;
                auth = firebaseConfig.auth;
                
                setFirebaseLoaded(true);
                console.log("Firebase loaded successfully");
            } catch (error) {
                console.error("Error loading Firebase:", error);
                setFirebaseError(error.message);
                setFirebaseLoaded(false);
            }
        };

        if (firebaseAvailable) {
            loadFirebase();
        } else {
            setFirebaseLoaded(false);
        }
    }, [firebaseAvailable]);

    // Function to handle Google login with Firebase.
    const handleGoogleLogin = async () => {
        if (!firebaseLoaded || !GoogleAuthProvider || !signInWithPopup || !auth) {
            alert("Firebase chưa được khởi tạo. Vui lòng thử lại hoặc đăng nhập bằng tài khoản khách.");
            return;
        }

        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log("Firebase Google Sign-In Successful:", user);

            // Get Firebase ID Token
            const idToken = await user.getIdToken();
            console.log("Firebase ID Token:", idToken);

            // Call callback from App.jsx
            onGoogleSignInSuccess({
                credential: idToken,
                profile: {
                    name: user.displayName,
                    email: user.email,
                    picture: user.photoURL,
                },
                uid: user.uid
            });

        } catch (error) {
            console.error("Firebase Google Sign-In Error:", error.code, error.message);
            
            let errorMessage = "Đã xảy ra lỗi khi đăng nhập Google. Vui lòng thử lại.";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.";
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = "Yêu cầu đăng nhập đã bị hủy. Vui lòng thử lại.";
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = "Popup đăng nhập bị chặn. Vui lòng cho phép popup và thử lại.";
            }
            alert(errorMessage);
        }
    };

    // Function to handle Anonymous login
    const handleAnonymousLogin = async () => {
        if (!firebaseLoaded || !signInAnonymously || !auth) {
            alert("Firebase chưa được khởi tạo. Vui lòng thử lại.");
            return;
        }

        try {
            console.log("Attempting anonymous sign-in...");
            await onLoginGuest(); // Call the provided onLoginGuest function
        } catch (error) {
            console.error("Anonymous Sign-In Error:", error);
            alert("Đã xảy ra lỗi khi đăng nhập tài khoản khách. Vui lòng thử lại.");
        }
    };

    // Listen for Firebase Auth state changes
    useEffect(() => {
        if (!firebaseLoaded || !onAuthStateChanged || !auth) {
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && !user.isAnonymous) {
                // User is signed in with Google
                console.log("Firebase Auth State Changed: User is signed in.", user);
                try {
                    const idToken = await user.getIdToken();
                    console.log("Firebase ID Token:", idToken);
                    onGoogleSignInSuccess({
                        credential: idToken,
                        profile: {
                            name: user.displayName,
                            email: user.email,
                            picture: user.photoURL,
                        },
                        uid: user.uid
                    });
                } catch (error) {
                    console.error("Error getting ID token:", error);
                }
            } else if (user && user.isAnonymous) {
                // Anonymous user
                console.log("Firebase Auth State Changed: Anonymous user signed in.", user);
            } else {
                console.log("Firebase Auth State Changed: User is signed out.");
            }
        });

        return () => unsubscribe();
    }, [firebaseLoaded, onGoogleSignInSuccess]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <svg
                viewBox="0 0 120 120"
                className="w-24 h-24 mb-4"
                aria-hidden="true"
                focusable="false"
            >
                <rect
                    x="10"
                    y="10"
                    width="100"
                    height="100"
                    rx="15"
                    ry="15"
                    fill="#2c2c2c"
                    stroke="#e5e7eb"
                    strokeWidth="5"
                />
                <line
                    className="scanner-lines"
                    x1="20"
                    y1="40"
                    x2="100"
                    y2="40"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="20 15"
                />
                <line
                    className="scanner-lines"
                    x1="20"
                    y1="60"
                    x2="100"
                    y2="60"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="20 15"
                />
                <line
                    className="scanner-lines"
                    x1="20"
                    y1="80"
                    x2="100"
                    y2="80"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="20 15"
                />
                <text
                    x="35"
                    y="75"
                    fontFamily="'Poppins', sans-serif"
                    fontSize="48"
                    fill="#ffffff"
                    fontWeight="700"
                    pointerEvents="none"
                >
                    ∑
                </text>
                <text
                    x="65"
                    y="50"
                    fontFamily="'Poppins', sans-serif"
                    fontSize="38"
                    fill="#ffffff"
                    fontWeight="700"
                    pointerEvents="none"
                >
                    √
                </text>
            </svg>
            <h2 className="text-3xl font-bold mb-2">Chào mừng đến với MathScanner!</h2>
            <p className="text-lg text-[#a0a0a0] max-w-md mb-8">
                Hãy đăng nhập để khám phá sức mạnh của việc giải mã công thức toán học!
            </p>

            <div className="flex flex-col space-y-4 items-center">
                {/* Google Login Button - Display only if Firebase is available */}
                {firebaseAvailable && (
                    <button
                        onClick={handleGoogleLogin}
                        disabled={!firebaseLoaded}
                        className={`w-full max-w-[240px] py-3 px-6 rounded-full font-semibold transition-colors duration-200 shadow-md flex items-center justify-center space-x-2 ${
                            firebaseLoaded 
                                ? "bg-[#3a3a3a] text-[#e5e7eb] hover:bg-[#4b4b4b]" 
                                : "bg-[#2a2a2a] text-[#888] cursor-not-allowed"
                        }`}
                    >
                        <i className="fab fa-google"></i>
                        <span>
                            {firebaseLoaded ? "Đăng nhập với Google" : "Đang tải..."}
                        </span>
                    </button>
                )}

                {/* Error message if Firebase failed to load */}
                {firebaseError && (
                    <div className="text-red-400 text-sm max-w-[240px] text-center">
                        Lỗi Firebase: {firebaseError}
                    </div>
                )}

                {/* Guest Login Button */}
                <button
                    onClick={onLoginGuest}
                    className="w-full max-w-[240px] py-3 px-6 rounded-full bg-[#4b4b4b] text-[#e5e7eb] font-semibold hover:bg-[#6a6a6a] transition-colors duration-200 shadow-md flex items-center justify-center space-x-2"
                >
                    <i className="fas fa-user-circle"></i>
                    <span>Tiếp tục với tư cách Khách</span>
                </button>
            </div>
        </div>
    );
};

export default AuthScreen;