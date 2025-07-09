import { useState, useRef, useEffect, useCallback } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "./App.css";
import axios from "axios";

let auth, db, signOut, signInAnonymously, collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, getDocs, deleteDoc, where, updateDoc;
try {
    const firebaseConfig = await import('./firebase-config');
    auth = firebaseConfig.auth;
    db = firebaseConfig.db;
    
    const firebaseAuth = await import("firebase/auth");
    signOut = firebaseAuth.signOut;
    signInAnonymously = firebaseAuth.signInAnonymously;
    
    const firestore = await import("firebase/firestore");
    collection = firestore.collection;
    addDoc = firestore.addDoc;
    query = firestore.query;
    orderBy = firestore.orderBy;
    onSnapshot = firestore.onSnapshot;
    doc = firestore.doc;
    setDoc = firestore.setDoc;
    getDocs = firestore.getDocs;
    deleteDoc = firestore.deleteDoc;
    where = firestore.where;
    updateDoc = firestore.updateDoc;
} catch (error) {
    console.error("Firebase import error:", error);
    auth = null;
    db = null;
}

// Import components
import Header from './components/Header';
import AuthScreen from './components/AuthScreen';
import ChatSidebar from './components/ChatSidebar';

function App() {
    const [messages, setMessages] = useState([]);
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasUploaded, setHasUploaded] = useState(false);
    const chatContainer = useRef(null);
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    // State for user authentication
    const [userProfile, setUserProfile] = useState(null);
    const [firebaseError, setFirebaseError] = useState(null);
    const [sessionExpiry, setSessionExpiry] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);

    // Chat management states
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(false);

    // Timer refs
    const sessionTimerRef = useRef(null);
    const countdownTimerRef = useRef(null);

    // Utility function to convert file to base64
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    // Function to handle Firebase Google Sign-In response
    const handleGoogleSignInSuccess = useCallback((firebaseResponse) => {
        console.log("handleGoogleSignInSuccess triggered in App.jsx");
        
        clearSessionTimers();
        
        setUserProfile({
            name: firebaseResponse.profile.name,
            email: firebaseResponse.profile.email,
            picture: firebaseResponse.profile.picture,
            id_token: firebaseResponse.credential,
            isAnonymous: false,
            uid: firebaseResponse.uid
        });

        sendTokenToBackend(firebaseResponse.credential);
    }, []);

    // Function to send Firebase ID Token to backend
    const sendTokenToBackend = async (id_token) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/verify-firebase-login`, { token: id_token });
            console.log('Backend Firebase token verification successful:', response.data);
        } catch (error) {
            console.error('Error sending Firebase ID Token to backend:', error.response?.data || error.message);
            alert('Authentication with backend failed. Please try again.');
            setUserProfile(null);
            if (auth && signOut) {
                signOut(auth);
            }
        }
    };

    // Clear session timers
    const clearSessionTimers = () => {
        if (sessionTimerRef.current) {
            clearTimeout(sessionTimerRef.current);
            sessionTimerRef.current = null;
        }
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        setSessionExpiry(null);
        setTimeRemaining(null);
    };

    // Handle session expiry
    const handleSessionExpiry = () => {
        alert("Phiên đăng nhập khách đã hết hạn. Vui lòng đăng nhập bằng Google để tiếp tục.");
        handleLogout();
    };

    // Start session timer for anonymous users
    const startSessionTimer = () => {
        const expiryTime = Date.now() + 15 * 60 * 1000; // 15 minutes
        setSessionExpiry(expiryTime);
        
        sessionTimerRef.current = setTimeout(() => {
            handleSessionExpiry();
        }, 15 * 60 * 1000);

        countdownTimerRef.current = setInterval(() => {
            const remaining = Math.max(0, expiryTime - Date.now());
            setTimeRemaining(remaining);
            
            if (remaining <= 0) {
                clearInterval(countdownTimerRef.current);
            }
        }, 1000);
    };

    // Anonymous Login Handler
    const handleLoginGuest = async () => {
        if (!auth || !signInAnonymously) {
            alert("Firebase chưa được khởi tạo. Vui lòng thử lại.");
            return;
        }

        try {
            const result = await signInAnonymously(auth);
            const user = result.user;
            
            const idToken = await user.getIdToken();
            console.log("Firebase Anonymous Sign-In Successful:", user);
            
            setUserProfile({
                name: "Khách",
                email: null,
                picture: null,
                id_token: idToken,
                isAnonymous: true,
                uid: user.uid
            });

            startSessionTimer();
            await sendTokenToBackend(idToken);
            
            console.log("Anonymous login successful with Firebase token");
        } catch (error) {
            console.error("Error with anonymous sign-in:", error);
            alert("Đã xảy ra lỗi khi đăng nhập tài khoản khách. Vui lòng thử lại.");
        }
    };

    // Handle Logout
    const handleLogout = async () => {
        try {
            clearSessionTimers();
            
            if (auth && signOut) {
                await signOut(auth);
            }
            
            setUserProfile(null);
            setMessages([]);
            setConversations([]);
            setCurrentConversationId(null);
            setHasUploaded(false);
            setSidebarOpen(false);
            console.log("Logged out successfully.");
            
            if (userProfile?.isAnonymous) {
                alert("Phiên đăng nhập khách đã kết thúc.");
            } else {
                alert("Bạn đã đăng xuất.");
            }
        } catch (error) {
            console.error("Error signing out:", error);
            alert("Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại.");
        }
    };

    // Create new conversation
    const createNewConversation = async () => {
        if (!db || !userProfile) return null;

        try {
            const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const conversationData = {
                id: conversationId,
                title: "Cuộc trò chuyện mới",
                createdAt: Date.now(),
                lastMessageAt: Date.now(),
                messageCount: 0,
                userType: userProfile.isAnonymous ? 'anonymous' : 'authenticated'
            };

            const conversationRef = doc(db, 'users', userProfile.uid, 'conversations', conversationId);
            await setDoc(conversationRef, conversationData);

            return conversationId;
        } catch (error) {
            console.error("Error creating new conversation:", error);
            return null;
        }
    };

    // Update conversation title based on first message
    const updateConversationTitle = async (conversationId, firstMessage) => {
        if (!db || !userProfile || !conversationId) return;

        try {
            // Generate a simple title from the first message or use default
            let title = "Cuộc trò chuyện mới";
            if (firstMessage && firstMessage.type === 'user') {
                title = `Phân tích công thức ${new Date().toLocaleDateString('vi-VN')}`;
            }

            const conversationRef = doc(db, 'users', userProfile.uid, 'conversations', conversationId);
            await updateDoc(conversationRef, {
                title: title,
                lastMessageAt: Date.now()
            });

            // Update local state
            setConversations(prev => prev.map(conv => 
                conv.id === conversationId 
                    ? { ...conv, title, lastMessageAt: Date.now() }
                    : conv
            ));
        } catch (error) {
            console.error("Error updating conversation title:", error);
        }
    };

    // Save message to Firestore
    const saveMessageToFirestore = async (messageContent, conversationId = null) => {
        if (!db || !userProfile) return;

        try {
            const targetConversationId = conversationId || currentConversationId;
            if (!targetConversationId) return;

            const messageRef = collection(db, 'users', userProfile.uid, 'conversations', targetConversationId, 'messages');
            await addDoc(messageRef, {
                ...messageContent,
                timestamp: Date.now(),
                userType: userProfile.isAnonymous ? 'anonymous' : 'authenticated'
            });

            // Update conversation's last message time and count
            const conversationRef = doc(db, 'users', userProfile.uid, 'conversations', targetConversationId);
            await updateDoc(conversationRef, {
                lastMessageAt: Date.now(),
                messageCount: messages.length + 1
            });

            console.log("Message saved to Firestore for conversation:", targetConversationId);
        } catch (error) {
            console.error("Error saving message to Firestore:", error);
        }
    };

    // Load conversations
    const loadConversations = async () => {
        if (!db || !userProfile) return;

        setIsLoadingConversations(true);
        try {
            const conversationsRef = collection(db, 'users', userProfile.uid, 'conversations');
            const q = query(conversationsRef, orderBy('lastMessageAt', 'desc'));
            const snapshot = await getDocs(q);
            
            const fetchedConversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setConversations(fetchedConversations);
            
            // If no current conversation and there are conversations, select the most recent one
            if (!currentConversationId && fetchedConversations.length > 0) {
                setCurrentConversationId(fetchedConversations[0].id);
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        } finally {
            setIsLoadingConversations(false);
        }
    };

    // Load messages for specific conversation
    const loadMessagesForConversation = async (conversationId) => {
        if (!db || !userProfile || !conversationId) return;

        try {
            const messagesRef = collection(db, 'users', userProfile.uid, 'conversations', conversationId, 'messages');
            const q = query(messagesRef, orderBy('timestamp'));
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMessages(fetchedMessages);
            });

            return unsubscribe;
        } catch (error) {
            console.error("Error loading messages for conversation:", error);
            return () => {};
        }
    };

    // Switch conversation
    const switchConversation = (conversationId) => {
        setCurrentConversationId(conversationId);
        setMessages([]);
        setHasUploaded(false);
        setSidebarOpen(false); // Close sidebar on mobile
    };

    // Start new conversation
    const startNewConversation = async () => {
        const newConversationId = await createNewConversation();
        if (newConversationId) {
            setCurrentConversationId(newConversationId);
            setMessages([]);
            setHasUploaded(false);
            setSidebarOpen(false);
            
            // Add to conversations list
            const newConversation = {
                id: newConversationId,
                title: "Cuộc trò chuyện mới",
                createdAt: Date.now(),
                lastMessageAt: Date.now(),
                messageCount: 0,
                userType: userProfile.isAnonymous ? 'anonymous' : 'authenticated'
            };
            setConversations(prev => [newConversation, ...prev]);
        }
    };

    // Delete conversation
    const deleteConversation = async (conversationId) => {
        if (!db || !userProfile || !conversationId) return;

        try {
            // Delete conversation document
            const conversationRef = doc(db, 'users', userProfile.uid, 'conversations', conversationId);
            await deleteDoc(conversationRef);

            // Delete all messages in the conversation
            const messagesRef = collection(db, 'users', userProfile.uid, 'conversations', conversationId, 'messages');
            const messagesSnapshot = await getDocs(messagesRef);
            
            const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // Update local state
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
            
            // If this was the current conversation, switch to another one or create new
            if (currentConversationId === conversationId) {
                const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
                if (remainingConversations.length > 0) {
                    setCurrentConversationId(remainingConversations[0].id);
                } else {
                    // Create a new conversation if none left
                    const newConversationId = await createNewConversation();
                    setCurrentConversationId(newConversationId);
                }
            }
        } catch (error) {
            console.error("Error deleting conversation:", error);
        }
    };

    // Handle file change
    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

    // Handle upload
    const handleUpload = async () => {
        if (!file) return;

        // Create new conversation if none exists
        let targetConversationId = currentConversationId;
        if (!targetConversationId) {
            targetConversationId = await createNewConversation();
            if (!targetConversationId) return;
            setCurrentConversationId(targetConversationId);
        }

        setIsLoading(true);
        setHasUploaded(true);

        try {
            // Convert file to base64 for storage
            const base64Image = await fileToBase64(file);
            
            const userMessage = {
                type: "user",
                preview: previewUrl,
                imageData: base64Image, // Store base64 image
                fileName: file.name,
                id: `user-${Date.now()}`,
            };
            
            const newMessages = [...messages, userMessage];
            setMessages(newMessages);
            await saveMessageToFirestore(userMessage, targetConversationId);

            // Update conversation title if this is the first message
            if (messages.length === 0) {
                await updateConversationTitle(targetConversationId, userMessage);
            }

            let botResponseData;

            if (API_BASE_URL) {
                console.log("Calling real API at:", API_BASE_URL);
                const formData = new FormData();
                formData.append("file", file);

                const headers = {
                    "Content-Type": "multipart/form-data",
                };

                if (userProfile?.id_token) {
                    headers["Authorization"] = `Bearer ${userProfile.id_token}`;
                }

                const response = await axios.post(
                    `${API_BASE_URL}/predict`,
                    formData,
                    { headers }
                );
                botResponseData = {
                    formula: response.data.formula || "\\text{Không có công thức}",
                };
            } else {
                console.warn("VITE_BACKEND_URL is not set. Using mock API.");
                await new Promise((resolve) => setTimeout(resolve, 1500));

                const mockFormula = `\\text{Mock formula for file: ${file.name}}.`;
                botResponseData = { formula: mockFormula };
            }

            const botMessage = {
                type: "bot",
                latex: botResponseData.formula,
                id: `bot-${Date.now() + 1}`,
            };

            setMessages(prev => [...prev, botMessage]);
            await saveMessageToFirestore(botMessage, targetConversationId);

        } catch (error) {
            console.error("Lỗi khi gửi yêu cầu tới API:", error);
            
            let errorMessage = "\\text{Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại.}";
            
            if (error.response?.status === 422) {
                errorMessage = "\\text{Lỗi: Trường file không hợp lệ. Vui lòng kiểm tra định dạng ảnh.}";
            } else if (error.response?.status === 500) {
                errorMessage = "\\text{Lỗi server. Vui lòng liên hệ đội backend.}";
            } else if (error.response?.status === 401 || error.response?.status === 403) {
                if (userProfile?.isAnonymous) {
                    errorMessage = "\\text{Phiên đăng nhập khách đã hết hạn. Vui lòng đăng nhập bằng Google.}";
                    handleSessionExpiry();
                } else {
                    errorMessage = "\\text{Lỗi xác thực. Vui lòng đăng nhập lại.}";
                    setUserProfile(null);
                    if (auth && signOut) {
                        signOut(auth);
                    }
                }
            }
            
            const errorBotMessage = {
                type: "bot",
                latex: errorMessage,
                id: `bot-${Date.now() + 1}`,
            };
            
            setMessages(prev => [...prev, errorBotMessage]);
            await saveMessageToFirestore(errorBotMessage, targetConversationId);

        } finally {
            setFile(null);
            setPreviewUrl(null);
            setIsLoading(false);
        }
    };

    // Handle key down
    const handleKeyDown = (event) => {
        if (event.key === "Enter" && file && !isLoading) {
            handleUpload();
        }
    };

    // Format remaining time
    const formatTime = (milliseconds) => {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Get user initials for avatar
    const getUserInitials = (name) => {
        if (!name) return "U";
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
    };

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chatContainer.current) {
            const scrollToBottom = () => {
                chatContainer.current.scrollTop = chatContainer.current.scrollHeight;
            };
            
            // Use setTimeout to ensure DOM is updated
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);

    // Clean up preview URL
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            clearSessionTimers();
        };
    }, []);

    // Load conversations when user profile changes
    useEffect(() => {
        if (userProfile) {
            loadConversations();
        } else {
            setConversations([]);
            setCurrentConversationId(null);
            setMessages([]);
            setHasUploaded(false);
        }
    }, [userProfile]);

    // Load messages when conversation changes
    useEffect(() => {
        let unsubscribe = () => {};

        if (currentConversationId) {
            unsubscribe = loadMessagesForConversation(currentConversationId);
        }

        return () => unsubscribe();
    }, [currentConversationId]);

    // Error boundary for Firebase issues
    if (firebaseError) {
        return (
            <div className="min-h-screen w-full flex flex-col bg-[#181818] text-[#e5e7eb] font-sans items-center justify-center">
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold mb-4 text-red-400">Firebase Configuration Error</h2>
                    <p className="text-gray-300 mb-4">There was an error loading Firebase configuration.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex bg-[#181818] text-[#e5e7eb] font-sans">
            {/* Sidebar */}
            {userProfile && (
                <ChatSidebar
                    conversations={conversations}
                    currentConversationId={currentConversationId}
                    onConversationSelect={switchConversation}
                    onNewConversation={startNewConversation}
                    onDeleteConversation={deleteConversation}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    isLoading={isLoadingConversations}
                    userProfile={userProfile}
                    getUserInitials={getUserInitials}
                />
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header 
                    userProfile={userProfile} 
                    onMenuClick={() => setSidebarOpen(true)}
                    showMenuButton={!!userProfile}
                    getUserInitials={getUserInitials}
                />

                {!userProfile ? (
                    <AuthScreen
                        onLoginGuest={handleLoginGuest}
                        onGoogleSignInSuccess={handleGoogleSignInSuccess}
                        firebaseAvailable={!!auth && !!signInAnonymously}
                    />
                ) : (
                    <div className="flex-1 flex flex-col bg-[#181818] overflow-hidden">
                        {/* Timer warning for anonymous users */}
                        {userProfile?.isAnonymous && timeRemaining && (
                            <div className="bg-yellow-600 text-white p-3 text-center">
                                <p className="text-sm">
                                    ⏰ Phiên đăng nhập khách sẽ hết hạn trong: <strong>{formatTime(timeRemaining)}</strong>
                                </p>
                                <p className="text-xs mt-1">
                                    Đăng nhập bằng Google để sử dụng không giới hạn
                                </p>
                            </div>
                        )}

                        {/* Chat Area */}
                        <div className="flex-1 flex justify-center px-4 overflow-hidden">
                            <div className="w-full max-w-4xl flex flex-col overflow-hidden">
                                {/* Logout button */}
                                <div className="flex justify-center py-4">
                                    <button
                                        onClick={handleLogout}
                                        className="py-2 px-4 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors duration-200 shadow-md"
                                    >
                                        {userProfile?.isAnonymous ? "Kết thúc phiên khách" : "Đăng xuất"}
                                    </button>
                                </div>

                                {/* Messages Container */}
                                <div
                                    ref={chatContainer}
                                    className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#4b4b4b] scrollbar-track-[#2c2c2c]"
                                >
                                    {messages.length === 0 && !hasUploaded ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 h-full">
                                            <p className="text-xl font-bold text-[#e5e7eb] mb-2">
                                                Xin chào {userProfile.name}!
                                            </p>
                                            {userProfile.isAnonymous && (
                                                <p className="text-sm text-yellow-400 mb-2">
                                                    Bạn đang sử dụng tài khoản khách - phiên làm việc có thời hạn 15 phút
                                                </p>
                                            )}
                                            <p className="text-lg text-[#a0a0a0] max-w-md">
                                                Hãy tải lên một ảnh chứa công thức toán học để tôi có thể giúp bạn giải mã chúng thành dạng LaTeX.
                                            </p>
                                        </div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${
                                                    msg.type === "user" ? "justify-end" : "justify-start"
                                                } w-full`}
                                            >
                                                <div
                                                    className={`message-bubble ${
                                                        msg.type === "user"
                                                            ? "bg-[#3a3a3a] text-[#e5e7eb] rounded-br-none"
                                                            : "bg-[#2c2c2c] text-[#e5e7eb] rounded-bl-none"
                                                    } p-4 rounded-xl max-w-[80%] md:max-w-[70%] break-words`}
                                                >
                                                    {msg.type === "user" && (msg.preview || msg.imageData) && (
                                                        <img
                                                            src={msg.imageData || msg.preview}
                                                            alt={msg.fileName || "Uploaded image"}
                                                            className="max-w-full rounded mb-2"
                                                            style={{ maxWidth: "250px" }}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'block';
                                                            }}
                                                        />
                                                    )}
                                                    {msg.type === "user" && (msg.preview || msg.imageData) && (
                                                        <div 
                                                            className="text-gray-400 text-sm italic mb-2"
                                                            style={{ display: 'none' }}
                                                        >
                                                            📷 {msg.fileName || "Ảnh đã tải lên"}
                                                        </div>
                                                    )}
                                                    {msg.type === "bot" && msg.latex && (
                                                        <div className="latex-result">
                                                            <p className="font-semibold text-sm text-[#d4d4d8] mb-1">
                                                                Mã LaTeX:
                                                            </p>
                                                            <p className="break-words text-base mb-2 select-all p-2 bg-[#1e1e1e] rounded border border-[#3a3a3a] overflow-x-auto">
                                                                {msg.latex}
                                                            </p>
                                                            <p className="font-semibold text-sm text-[#d4d4d8] mb-1">
                                                                Công thức:
                                                            </p>
                                                            <div className="latex-display-container p-2 bg-[#1e1e1e] rounded border border-[#3a3a3a] overflow-x-auto">
                                                                <BlockMath math={msg.latex} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {isLoading && (
                                        <div className="flex justify-start w-full">
                                            <div className="message-bubble bg-[#2c2c2c] text-[#e5e7eb] rounded-xl rounded-bl-none p-4 max-w-[80%] md:max-w-[70%]">
                                                <div className="loading-dots">
                                                    <div></div>
                                                    <div></div>
                                                    <div></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Upload Container */}
                        <div className="upload-container bg-[#181818] border-t border-[#2c2c2c] p-4 flex justify-center z-10">
                            <div
                                className="flex items-center gap-3 bg-[#242424] rounded-xl p-3 w-full max-w-4xl shadow-lg"
                                tabIndex={0}
                                onKeyDown={handleKeyDown}
                            >
                                <label className="flex items-center gap-2 bg-[#3a3a3a] text-[#d4d4d8] px-4 py-2 rounded-full cursor-pointer hover:bg-[#4b4b4b] transition-colors duration-200 relative overflow-hidden">
                                    <i className="fas fa-paperclip"></i>
                                    <span className="whitespace-nowrap">Chọn ảnh</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={isLoading}
                                    />
                                </label>
                                <span className="upload-text flex-1 text-left text-sm text-[#9ca3a1] truncate px-2">
                                    {isLoading ? (
                                        "Đang xử lý..."
                                    ) : file ? (
                                        file.name
                                    ) : hasUploaded ? (
                                        "Vui lòng tải lên ảnh chứa công thức toán học."
                                    ) : (
                                        "Tải lên ảnh chứa công thức toán học để bắt đầu."
                                    )}
                                </span>
                                <button
                                    onClick={handleUpload}
                                    className={`bg-[#3a3a3a] rounded-xl p-2 text-[#d4d4d8] flex items-center justify-center w-10 h-10 transition-colors duration-200
                                        ${!file || isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4b4b4b]"}
                                    `}
                                    disabled={!file || isLoading}
                                >
                                    {isLoading ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        <i className="fas fa-arrow-up"></i>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;