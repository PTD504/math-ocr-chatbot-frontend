// client/src/App.jsx
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

export default function App() {
    const [userProfile, setUserProfile] = useState(null);
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasUploaded, setHasUploaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const chatContainerRef = useRef(null); // Renamed for clarity

    // Use firebaseClientLoaded from useFirebase
    const {
        handleGoogleLogin, // Renamed from handleGoogleSignInSuccess
        handleLoginGuest,
        handleLogout,
        sessionExpiry,
        timeRemaining,
        firebaseClientLoaded, // New prop
    } = useFirebase(setUserProfile);

    const {
        messages, setMessages,
        conversations,
        currentConversationId, setCurrentConversationId,
        createNewConversation,
        updateConversationTitle,
        saveMessage,
        loadConversations, // Not strictly necessary to expose, but useful for initial load debug
        deleteConversation
    } = useChatManager(userProfile); // Pass userProfile to useChatManager

    // Backend API URL (same as in useFirebase and useChatManager)
    const API_BASE_URL = import.meta.env.PROD 
        ? import.meta.env.VITE_BACKEND_URL_DOCKER || import.meta.env.VITE_BACKEND_URL 
        : import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';


    // Auto-scroll to bottom of chat
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Handle file input change
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setHasUploaded(false); // Reset upload status when new file selected
        }
    };

    // Handle image upload to backend
    const handleUpload = useCallback(async () => {
        if (!file || isLoading || !currentConversationId || !userProfile?.id_token) {
            alert("Vui lòng chọn ảnh và đảm bảo bạn đã đăng nhập.");
            return;
        }

        setIsLoading(true);
        setHasUploaded(true); // Indicate that an upload attempt has been made

        // Add user message to chat area immediately
        const userMessage = {
            type: "user",
            content: `Đang tải ảnh: ${file.name}`, // Placeholder for now
            conversationId: currentConversationId,
        };
        // No need to save to DB yet, as the backend will handle that once image is processed successfully
        setMessages(prev => [...prev, userMessage]);


        const formData = new FormData();
        formData.append("image", file); // 'image' should match the name in server/app/main.py @app.post("/process-image")

        try {
            // Send image to your FastAPI backend's /process-image endpoint
            const response = await axios.post(
                `${API_BASE_URL}/process-image`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${userProfile.id_token}`, // Send Firebase ID token
                    },
                }
            );

            const { formula } = response.data;

            // Update the user's message to show the image (optional, if you want to display the image they uploaded)
            // For now, let's just display the bot's response.
            // If you want to show the image, you'd need to convert it to a URL or base64.
            // For simplicity, we'll just show the bot's response.
            setMessages(prev => {
                const updatedMessages = [...prev];
                // Update the last user message to reflect the actual image upload/processing complete
                // Or simply add a new bot message after user message.
                // For now, let's add bot message directly and assume user message was visual
                return updatedMessages;
            });
            
            // Save the user message (now with actual image indication if needed)
            // And then save the bot's response to the database
            await saveMessage({ type: "user", content: `Ảnh đã tải: ${file.name}`, conversationId: currentConversationId });
            await saveMessage({ type: "bot", latex: formula, conversationId: currentConversationId });

            setFile(null); // Clear the selected file
            // Update conversation title with first bot message
            if (messages.length === 0) { // If it was the first message in a new conversation
                updateConversationTitle(currentConversationId, { type: "user" });
            }

        } catch (error) {
            console.error("Error uploading image or processing:", error.response?.data || error.message);
            alert(`Tải ảnh thất bại: ${error.response?.data?.detail || error.message}`);
            // Add an error message from the bot
            await saveMessage({
                type: "bot",
                content: `Xin lỗi, có lỗi xảy ra khi xử lý ảnh. Vui lòng thử lại. Chi tiết: ${error.response?.data?.detail || error.message}`,
                conversationId: currentConversationId
            });
        } finally {
            setIsLoading(false);
            // setHasUploaded(true); // Keep this to indicate a file was attempted
        }
    }, [file, isLoading, currentConversationId, userProfile, API_BASE_URL, saveMessage, updateConversationTitle, messages.length]); // Added messages.length to dependency array

    // Handle Enter key press on upload bar
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && file && !isLoading) {
            handleUpload();
        }
    };

    // Helper to get user initials for avatar
    const getUserInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    };

    // This useEffect ensures the current conversation is selected upon user profile changes
    // or when conversations are loaded.
    useEffect(() => {
        if (userProfile && conversations.length > 0 && !currentConversationId) {
            setCurrentConversationId(conversations[0].id);
        } else if (userProfile && conversations.length === 0) {
            // If user logs in and has no conversations, create one (handled by useChatManager)
        }
    }, [userProfile, conversations, currentConversationId, setCurrentConversationId]);


    return (
        <div className="flex h-screen bg-[#181818] text-[#e5e7eb] font-sans">
            {/* Overlay and Sidebar */}
            <ChatSidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onConversationSelect={(id) => setCurrentConversationId(id)}
                onNewConversation={createNewConversation}
                onDeleteConversation={deleteConversation}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isLoading={isLoading}
                userProfile={userProfile}
                getUserInitials={getUserInitials}
            />

            {/* Main content area */}
            <div className="flex flex-col flex-1 relative">
                <Header
                    userProfile={userProfile}
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                    showMenuButton={true}
                    getUserInitials={getUserInitials}
                />

                {!userProfile ? (
                    <AuthScreen
                        onGoogleLogin={handleGoogleLogin} // Corrected prop name
                        onLoginGuest={handleLoginGuest}
                        firebaseClientLoaded={firebaseClientLoaded} // Pass loading status
                        // firebaseError prop can be removed from AuthScreen if you only show clientLoaded
                    />
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Session timer for guest users */}
                        {userProfile.isAnonymous && sessionExpiry && (
                            <div className="bg-yellow-600 text-white text-center py-1.5 text-sm flex items-center justify-center gap-2">
                                <i className="fas fa-hourglass-half"></i>
                                <span>Phiên khách sẽ hết hạn sau: {Math.ceil(timeRemaining / 1000 / 60)} phút</span>
                                <button
                                    onClick={handleLogout}
                                    className="ml-4 px-3 py-1 bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md"
                                >
                                    {userProfile?.isAnonymous ? "Kết thúc phiên khách" : "Đăng xuất"}
                                </button>
                            </div>
                        )}

                        {/* Chat Area - main scrollable content */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin" ref={chatContainerRef}>
                            <div className="flex justify-center min-h-full">
                                <div className="w-full max-w-4xl flex flex-col">
                                    <ChatArea
                                        messages={messages}
                                        isLoading={isLoading}
                                        userProfile={userProfile}
                                        chatContainerRef={chatContainerRef} // Pass ref here
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Upload Bar fixed at bottom */}
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