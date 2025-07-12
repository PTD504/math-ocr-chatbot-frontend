// client/src/hooks/useChatManager.js
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
// import { collection, doc, setDoc, updateDoc, addDoc, deleteDoc, getDocs, onSnapshot, query, orderBy } from "firebase/firestore"; // REMOVE THIS LINE

export default function useChatManager(userProfile) {
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);

    const API_BASE_URL = import.meta.env.PROD 
        ? import.meta.env.VITE_BACKEND_URL_DOCKER || import.meta.env.VITE_BACKEND_URL 
        : import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

    // Helper to get auth headers
    const getAuthHeaders = useCallback(() => {
        if (!userProfile?.id_token) {
            console.warn("No ID token found for authenticated request.");
            return {};
        }
        return {
            headers: {
                Authorization: `Bearer ${userProfile.id_token}`,
            },
        };
    }, [userProfile]);


    const createNewConversation = useCallback(async () => {
        if (!userProfile?.uid) {
            console.error("User not authenticated to create conversation.");
            return null;
        }
        try {
            const response = await axios.post(
                `${API_BASE_URL}/chat/conversations`,
                {}, // No body needed for new conversation
                getAuthHeaders()
            );
            const newConv = response.data;
            setConversations(prev => [newConv, ...prev]); // Add new conv to top
            return newConv.id;
        } catch (error) {
            console.error("Error creating new conversation:", error.response?.data || error.message);
            alert(`Tạo cuộc trò chuyện mới thất bại: ${error.response?.data?.detail || error.message}`);
            return null;
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders]);

    const updateConversationTitle = useCallback(async (convId, firstMsg) => {
        if (!convId || !userProfile?.uid) return;

        const title = firstMsg?.type === 'user'
            ? `Phân tích công thức ${new Date().toLocaleDateString('vi-VN')}`
            : "Cuộc trò chuyện mới";

        try {
            await axios.put(
                `${API_BASE_URL}/chat/conversations/${convId}/title`,
                { title },
                getAuthHeaders()
            );
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === convId ? { ...conv, title: title } : conv
                )
            );
            console.log(`Conversation ${convId} title updated to: ${title}`);
        } catch (error) {
            console.error(`Error updating conversation ${convId} title:`, error.response?.data || error.message);
            // Optionally, handle error state or revert title in UI
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders]);

    const saveMessage = useCallback(async (message) => {
        if (!currentConversationId || !userProfile?.uid) {
            console.error("Not in a conversation or user not authenticated to save message.");
            return;
        }
        try {
            // Backend will handle adding ID, timestamp, and updating conversation metadata
            const response = await axios.post(
                `${API_BASE_URL}/chat/conversations/${currentConversationId}/messages`,
                message, // message object { type, content, latex }
                getAuthHeaders()
            );
            const savedMessage = response.data;
            setMessages(prev => [...prev, savedMessage]);

            // Update lastMessageAt and messageCount in conversations state
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === currentConversationId ? {
                        ...conv,
                        lastMessageAt: savedMessage.timestamp,
                        messageCount: conv.messageCount + 1 // Increment message count
                    } : conv
                ).sort((a, b) => b.lastMessageAt - a.lastMessageAt) // Re-sort by lastMessageAt
            );

        } catch (error) {
            console.error("Error saving message:", error.response?.data || error.message);
            alert(`Lưu tin nhắn thất bại: ${error.response?.data?.detail || error.message}`);
        }
    }, [userProfile, currentConversationId, API_BASE_URL, getAuthHeaders]);


    const loadConversations = useCallback(async () => {
        if (!userProfile?.uid) {
            setConversations([]);
            setCurrentConversationId(null);
            setMessages([]);
            return;
        }
        try {
            const response = await axios.get(
                `${API_BASE_URL}/chat/conversations`,
                getAuthHeaders()
            );
            const loadedConversations = response.data;
            setConversations(loadedConversations);

            if (loadedConversations.length > 0) {
                // If there are existing conversations, select the latest one
                setCurrentConversationId(loadedConversations[0].id);
            } else {
                // If no conversations, create a new one
                const newId = await createNewConversation();
                setCurrentConversationId(newId);
            }
        } catch (error) {
            console.error("Error loading conversations:", error.response?.data || error.message);
            alert(`Tải cuộc trò chuyện thất bại: ${error.response?.data?.detail || error.message}`);
            // Fallback: create a new one if loading fails
            const newId = await createNewConversation();
            setCurrentConversationId(newId);
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders, createNewConversation]);

    const loadMessages = useCallback(async (convId) => {
        if (!convId || !userProfile?.uid) {
            setMessages([]);
            return;
        }
        try {
            const response = await axios.get(
                `${API_BASE_URL}/chat/conversations/${convId}/messages`,
                getAuthHeaders()
            );
            setMessages(response.data);
            console.log(`Messages loaded for conversation ${convId}`);
        } catch (error) {
            console.error(`Error loading messages for conversation ${convId}:`, error.response?.data || error.message);
            alert(`Tải tin nhắn thất bại: ${error.response?.data?.detail || error.message}`);
            setMessages([]); // Clear messages on error
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders]);


    const deleteConversation = useCallback(async (convId) => {
        if (!userProfile?.uid || !convId) {
            console.error("User not authenticated or conversation ID missing to delete.");
            return;
        }
        try {
            await axios.delete(
                `${API_BASE_URL}/chat/conversations/${convId}`,
                getAuthHeaders()
            );
            setConversations(prev => prev.filter(c => c.id !== convId));
            if (currentConversationId === convId) {
                const rest = conversations.filter(c => c.id !== convId);
                if (rest.length > 0) {
                    setCurrentConversationId(rest[0].id);
                } else {
                    const newId = await createNewConversation();
                    setCurrentConversationId(newId);
                }
            }
            console.log(`Conversation ${convId} deleted.`);
        } catch (error) {
            console.error(`Error deleting conversation ${convId}:`, error.response?.data || error.message);
            alert(`Xóa cuộc trò chuyện thất bại: ${error.response?.data?.detail || error.message}`);
        }
    }, [userProfile, currentConversationId, conversations, API_BASE_URL, getAuthHeaders, createNewConversation]);


    useEffect(() => {
        if (userProfile) {
            loadConversations();
        } else {
            setConversations([]);
            setCurrentConversationId(null);
            setMessages([]);
        }
    }, [userProfile, loadConversations]);

    useEffect(() => {
        if (!currentConversationId || !userProfile?.uid) { // Ensure user is logged in
            setMessages([]); // Clear messages if no current conversation or not logged in
            return;
        }
        loadMessages(currentConversationId);
    }, [currentConversationId, loadMessages, userProfile]);

    return {
        messages,
        setMessages,
        conversations,
        currentConversationId,
        setCurrentConversationId,
        createNewConversation,
        updateConversationTitle,
        saveMessage,
        loadConversations,
        deleteConversation,
    };
}