import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export default function useChatManager(userProfile) {
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);

    const API_BASE_URL = import.meta.env.PROD 
        ? import.meta.env.VITE_BACKEND_URL_DOCKER || import.meta.env.VITE_BACKEND_URL 
        : import.meta.env.VITE_BACKEND_URL;

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

    const updateConversationTitle = useCallback(async (convId, firstMsgOrCustomTitle) => {
        if (!convId || !userProfile?.uid) return;

        let title;

        if (typeof firstMsgOrCustomTitle === 'string') {
            title = firstMsgOrCustomTitle.trim();
        } else {
            title = firstMsgOrCustomTitle?.type === 'user'
                ? `Phân tích công thức ${new Date().toLocaleDateString('vi-VN')}`
                : "Cuộc trò chuyện mới";
        }

        try {
            await axios.put(
                `${API_BASE_URL}/chat/conversations/${convId}/title`,
                { title },
                getAuthHeaders()
            );
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === convId ? { ...conv, title } : conv
                )
            );
            console.log(`Conversation ${convId} title updated to: ${title}`);
        } catch (error) {
            console.error(`Error updating conversation ${convId} title:`, error.response?.data || error.message);
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders]);

    const saveMessage = useCallback(async (message, conversationId) => {
        if (!conversationId || !userProfile?.uid) {
            console.error("Not in a conversation or user not authenticated to save message.");
            return;
        }
        try {
            const response = await axios.post(
                `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
                message, // { type, content, latex, imageData, preview, ... }
                getAuthHeaders()
            );
            const savedMessage = response.data;

            setMessages(prev => [...prev, message]);
            console.log(`Message saved: ${savedMessage.id}`);
            setConversations(prev =>
                prev.map(conv =>
                    conv.id === conversationId ? {
                        ...conv,
                        lastMessageAt: savedMessage.timestamp,
                        messageCount: conv.messageCount + 1
                    } : conv
                ).sort((a, b) => b.lastMessageAt - a.lastMessageAt)
            );

        } catch (error) {
            console.error("Error saving message:", error.response?.data || error.message);
            alert(`Lưu tin nhắn thất bại: ${error.response?.data?.detail || error.message}`);
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders]);


    const loadConversations = useCallback(async () => {
        if (!userProfile?.uid || userProfile.isAnonymous) {
            setConversations([]);
            setCurrentConversationId(null);
            setMessages([]);
            return;
        }
        try {
            setConversations(null); // Set to null to indicate loading state
            const response = await axios.get(
                `${API_BASE_URL}/chat/conversations`,
                getAuthHeaders()
            );
            const loadedConversations = response.data;
            setConversations(loadedConversations);
            setCurrentConversationId(null);
        } catch (error) {
            console.error("Error loading conversations:", error.response?.data || error.message);
            alert(`Tải cuộc trò chuyện thất bại: ${error.response?.data?.detail || error.message}`);
            setConversations([]);
            setCurrentConversationId(null);
        }
    }, [userProfile, API_BASE_URL, getAuthHeaders]);

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
                setCurrentConversationId(null);
                setMessages([]); 
            }
            console.log(`Conversation ${convId} deleted.`);
        } catch (error) {
            console.error(`Error deleting conversation ${convId}:`, error.response?.data || error.message);
            alert(`Xóa cuộc trò chuyện thất bại: ${error.response?.data?.detail || error.message}`);
        }
    }, [userProfile, currentConversationId, conversations, API_BASE_URL, getAuthHeaders, createNewConversation]);

    useEffect(() => {
        if (userProfile) {
            if (!userProfile.isAnonymous) {
                loadConversations(); 
            } else {
                setConversations([]);
                setCurrentConversationId(null);
                setMessages([]);
            }
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