// client/src/components/AuthScreen.jsx
import React from 'react';

const AuthScreen = ({ onLoginGuest, onGoogleLogin, firebaseClientLoaded, firebaseError }) => {
    // We can remove the useState and useEffect for dynamic Firebase loading
    // and rely on firebaseClientLoaded prop passed from useFirebase hook

    return (
        <div className="min-h-screen bg-[#181818] flex items-center justify-center p-4">
            <div className="bg-[#242424] p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-[#e5e7eb] mb-2">
                        Chào mừng bạn!
                    </h2>
                    <p className="text-[#a0a0a0]">
                        Đăng nhập để bắt đầu phiên làm việc.
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Google Login Button */}
                    <button
                        onClick={onGoogleLogin} // Call the prop function
                        disabled={!firebaseClientLoaded} // Disable if Firebase client isn't loaded
                        className={`w-full max-w-[240px] py-3 px-6 rounded-full font-semibold transition-colors duration-200 shadow-md flex items-center justify-center space-x-2 ${
                            firebaseClientLoaded
                                ? "bg-[#3a3a3a] text-[#e5e7eb] hover:bg-[#4b4b4b]"
                                : "bg-[#2a2a2a] text-[#888] cursor-not-allowed"
                        }`}
                    >
                        <i className="fab fa-google"></i>
                        <span>
                            {firebaseClientLoaded ? "Đăng nhập với Google" : "Đang tải..."}
                        </span>
                    </button>

                    {/* Error message if Firebase failed to load */
                    // This error now comes from useFirebase hook
                    firebaseError && (
                        <div className="text-red-400 text-sm max-w-[240px] text-center">
                            Lỗi Firebase: {firebaseError}
                        </div>
                    )}

                    {/* Guest Login Button */}
                    <button
                        onClick={onLoginGuest} // Call the prop function
                        className="w-full max-w-[240px] py-3 px-6 rounded-full bg-[#4b4b4b] text-[#e5e7eb] font-semibold hover:bg-[#6a6a6a] transition-colors duration-200 shadow-md flex items-center justify-center space-x-2"
                    >
                        <i className="fas fa-user-circle"></i>
                        <span>Tiếp tục với tư cách Khách</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;