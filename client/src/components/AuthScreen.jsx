import React from 'react';

const AuthScreen = ({ onLoginGuest, onGoogleLogin, firebaseClientLoaded, firebaseError }) => {
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
                <button
                    onClick={onGoogleLogin}
                    disabled={!firebaseClientLoaded}
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

                {/* Firebase Error Display */}
                {firebaseError && (
                    <div className="text-red-400 text-sm max-w-[240px] text-center">
                        Lỗi Firebase: {firebaseError}
                    </div>
                )}

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
