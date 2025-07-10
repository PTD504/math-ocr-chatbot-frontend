import { useState, useRef, useEffect, useCallback } from "react";
import "katex/dist/katex.min.css";
import Header from "./components/Header";
import AuthScreen from "./components/AuthScreen";
import ChatSidebar from "./components/ChatSidebar";
import ChatArea from "./components/ChatArea";
import UploadBar from "./components/UploadBar";
import useFirebase from "./hooks/useFirebase";
import useChatManager from "./hooks/useChatManager";
import { auth, db } from "./firebase-config";

export default function App() {
    const [userProfile, setUserProfile] = useState(null);
    const [firebaseError] = useState(null);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasUploaded, setHasUploaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const chatContainer = useRef(null);

    const {
        handleGoogleSignInSuccess,
        handleLoginGuest,
        handleLogout,
        sessionExpiry,
        timeRemaining
    } = useFirebase(setUserProfile);

    const {
        messages, setMessages,
        conversations,
        currentConversationId, setCurrentConversationId,
        createNewConversation,
        updateConversationTitle,
        saveMessage,
        loadConversations,
        deleteConversation
    } = useChatManager(userProfile, db);

    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);
    };

    const fileToBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // Hàm scroll xuống cuối
    const scrollToBottom = useCallback(() => {
        if (chatContainer.current) {
            setTimeout(() => {
                chatContainer.current.scrollTop = chatContainer.current.scrollHeight;
            }, 50);
        }
    }, []);

    const handleUpload = async () => {
        if (!file) return;
        setIsLoading(true);
        setHasUploaded(true);

        let convId = currentConversationId;
        if (!convId) {
            convId = await createNewConversation();
            setCurrentConversationId(convId);
        }

        const base64Image = await fileToBase64(file);
        const userMessage = {
            type: "user",
            preview: previewUrl,
            imageData: base64Image,
            fileName: file.name,
            id: `user-${Date.now()}`,
        };

        setMessages((prev) => [...prev, userMessage]);
        await saveMessage(userMessage, convId);
        if (messages.length === 0) await updateConversationTitle(convId, userMessage);

        // Scroll xuống sau khi thêm tin nhắn user
        setTimeout(() => scrollToBottom(), 100);

        try {
            const formData = new FormData();
            formData.append("file", file);
            
            const headers = {};
            if (userProfile?.id_token) {
                headers["Authorization"] = `Bearer ${userProfile.id_token}`;
            }

            const res = await fetch(`${API_BASE_URL}/predict`, { method: "POST", body: formData, headers });
            const data = await res.json();

            const botMsg = {
                type: "bot",
                latex: data.formula || "\\text{Không có công thức}",
                id: `bot-${Date.now() + 1}`,
            };
            setMessages((prev) => [...prev, botMsg]);
            await saveMessage(botMsg, convId);
            
            // Scroll xuống sau khi thêm tin nhắn bot
            setTimeout(() => scrollToBottom(), 100);
        } catch (err) {
            const botMsg = {
                type: "bot",
                latex: "\\text{Đã xảy ra lỗi. Vui lòng thử lại.}",
                id: `bot-${Date.now() + 1}`,
            };
            setMessages((prev) => [...prev, botMsg]);
            await saveMessage(botMsg, convId);
            
            setTimeout(() => scrollToBottom(), 100);
        } finally {
            setFile(null);
            setPreviewUrl(null);
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && file && !isLoading) handleUpload();
    };

    // Auto-scroll khi có tin nhắn mới
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    if (firebaseError) {
        return <div>Lỗi Firebase. Vui lòng tải lại trang.</div>;
    }

    return (
        <div className="h-screen w-full flex bg-[#181818] text-[#e5e7eb] font-sans">
            {userProfile && (
                <ChatSidebar
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onConversationSelect={setCurrentConversationId}
                    onNewConversation={async () => {
                        const id = await createNewConversation();
                        setCurrentConversationId(id);
                        setMessages([]);
                    }}
                    onDeleteConversation={deleteConversation}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    isLoading={false}
                    userProfile={userProfile}
                    getUserInitials={(name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                />
            )}
            <div className="flex-1 flex flex-col min-h-0">
                <Header
                    userProfile={userProfile}
                    onMenuClick={() => setSidebarOpen(true)}
                    showMenuButton={!!userProfile}
                    getUserInitials={(name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                />
                {!userProfile ? (
                    <AuthScreen
                        onLoginGuest={handleLoginGuest}
                        onGoogleSignInSuccess={handleGoogleSignInSuccess}
                        firebaseAvailable={!!auth}
                    />
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Thanh thông báo session (nếu có) */}
                        {userProfile?.isAnonymous && timeRemaining && (
                            <div className="bg-yellow-600 text-white p-3 text-center text-sm flex-shrink-0">
                                ⏰ Phiên khách còn: <strong>{Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}</strong>
                            </div>
                        )}
                        
                        {/* Thanh nút đăng xuất cố định */}
                        <div className="flex justify-center py-4 bg-[#181818] border-b border-[#2c2c2c] flex-shrink-0 sticky top-0 z-10">
                            <button
                                onClick={handleLogout}
                                className="py-2 px-4 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md"
                            >
                                {userProfile?.isAnonymous ? "Kết thúc phiên khách" : "Đăng xuất"}
                            </button>
                        </div>

                        {/* Khu vực chat - overflow-y-auto để có thanh cuộn chính */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin">
                            <div className="flex justify-center min-h-full">
                                <div className="w-full max-w-4xl flex flex-col">
                                <ChatArea
                                    messages={messages}
                                    isLoading={isLoading}
                                    userProfile={userProfile}
                                />
                                </div>
                            </div>
                        </div>

                        {/* Thanh upload cố định ở bottom */}
                        <UploadBar
                            file={file}
                            isLoading={isLoading}
                            hasUploaded={hasUploaded}
                            onFileChange={handleFileChange}
                            onUpload={handleUpload}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}