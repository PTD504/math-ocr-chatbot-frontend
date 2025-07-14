import { useState, useRef, useEffect, useCallback } from "react";
import "katex/dist/katex.min.css";
import Header from "./components/Header";
import AuthScreen from "./components/AuthScreen";
import ChatSidebar from "./components/ChatSidebar";
import ChatArea from "./components/ChatArea";
import UploadBar from "./components/UploadBar";
import useFirebase from "./hooks/useFirebase";
import useChatManager from "./hooks/useChatManager";
import axios from "axios";
import { set } from "date-fns";

export default function App() {
    const [userProfile, setUserProfile] = useState(null);
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // Used for handleUpload
    const [hasUploaded, setHasUploaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const chatContainerRef = useRef(null);

    const {
        handleGoogleLogin,
        handleLoginGuest,
        handleLogout,
        sessionExpiry,
        timeRemaining,
        firebaseClientLoaded,
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
    } = useChatManager(userProfile); 

    const API_BASE_URL = import.meta.env.PROD 
        ? import.meta.env.VITE_BACKEND_URL_DOCKER || import.meta.env.VITE_BACKEND_URL 
        : import.meta.env.VITE_BACKEND_URL;

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setHasUploaded(false); // Reset upload status when new file selected
        }
    };

    // Handle image upload to backend
    const handleUpload = useCallback(async () => {
        if (!file || isUploading || !userProfile?.id_token) return;

        console.log("handleUpload called at", Date.now());

        setIsLoading(true);
        setIsUploading(true);
        setHasUploaded(true);

        let convId = currentConversationId;
        if (!convId) {
            convId = await createNewConversation();
            if (!convId) {
                setIsUploading(false);
                alert("Không thể tạo cuộc trò chuyện mới.");
                return;
            }
            setCurrentConversationId(convId);
        }

        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const base64Image = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);

        // Create user message object
        const userMessage = {
            type: "user",
            preview: previewUrl,
            imageData: base64Image,
            fileName: file.name,
            conversationId: convId,
            id: `user-${Date.now()}`,
        };

        await saveMessage(userMessage, convId);
        
        if (messages.length === 0) {
            await updateConversationTitle(convId, userMessage);
        }

        try {
            const formData = new FormData();
            formData.append("image", file); 

            const response = await axios.post(
                `${API_BASE_URL}/process-image`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        "Authorization": `Bearer ${userProfile.id_token}`,
                    },
                }
            );

            const { formula } = response.data;
            const botMsg = {
                type: "bot",
                latex: formula || "\\text{Không có công thức}",
                conversationId: convId,
                id: `bot-${Date.now() + 1}`,
            };

            await saveMessage(botMsg, convId);
        } catch (err) {
            console.error("Lỗi xử lý ảnh:", err);
            const botMsg = {
                type: "bot",
                latex: "\\text{Đã xảy ra lỗi. Vui lòng thử lại.}",
                conversationId: convId,
                id: `bot-${Date.now() + 1}`,
            };

            await saveMessage(botMsg, convId);
        } finally {
            setFile(null);
            setIsLoading(false);
            setIsUploading(false);
        }
    }, [file, isUploading, userProfile, messages.length, createNewConversation, saveMessage, updateConversationTitle, API_BASE_URL]);

    const handleNewConversation = async () => {
        if (!currentConversationId) {
            return;
        }
        
        setCurrentConversationId(null);
        setMessages([]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!isUploading && file) {
                handleUpload();
            }
        }
    };

    const getUserInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    };

    useEffect(() => {
        setIsLoading(true);
        loadConversations().finally(() => setIsLoading(false));
    }, [userProfile, loadConversations]);

    const renameConversation = async (id, newTitle) => {
        try {
            await updateConversationTitle(id, newTitle);
        } catch (error) {
            console.error("Rename failed:", error);
        }
    };

    return (
        <div className="h-screen flex overflow-hidden bg-[#181818] text-[#e5e7eb] font-sans">
            {userProfile && !userProfile.isAnonymous && (
                <ChatSidebar
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onConversationSelect={(id) => setCurrentConversationId(id)}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={deleteConversation}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onRenameConversation={renameConversation}
                    onLogout={handleLogout}
                    userProfile={userProfile}
                    getUserInitials={getUserInitials}
                />
            )}

            {/* Main content area */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {userProfile && (
                    <Header
                        userProfile={userProfile}
                        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                        showMenuButton={true}
                        getUserInitials={getUserInitials}
                    />
                )}

                {!userProfile ? (
                    <AuthScreen
                        onGoogleLogin={handleGoogleLogin}
                        onLoginGuest={handleLoginGuest}
                        firebaseClientLoaded={firebaseClientLoaded}
                    />
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Session timer for guest users */}
                        {userProfile.isAnonymous && sessionExpiry && (
                            <div className="bg-blue-600 text-white text-center py-1.5 text-sm flex items-center justify-center gap-2">
                                <i className="fas fa-clock"></i>
                                <span>Phiên khách sẽ hết hạn sau: {Math.ceil(timeRemaining / 1000 / 60)} phút</span>
                                <button
                                    onClick={handleGoogleLogin}
                                    className="ml-4 px-3 py-1 bg-white text-blue-600 font-semibold hover:bg-gray-100 shadow-md flex items-center gap-2"
                                >
                                    <span>Đăng nhập</span>
                                </button>
                            </div>
                        )}

                        {/* Scrollable Chat Content */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin" ref={chatContainerRef}>
                            <div className="flex justify-center min-h-full">
                                <div className="w-full max-w-4xl flex flex-col">
                                    <ChatArea
                                        messages={messages}
                                        isLoading={isLoading}
                                        userProfile={userProfile}
                                        chatContainerRef={chatContainerRef}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Upload Bar fixed below scrollable content */}
                        <UploadBar
                            file={file}
                            isUploading={isUploading}
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