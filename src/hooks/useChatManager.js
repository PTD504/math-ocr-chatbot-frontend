import { useState, useEffect } from "react";
import {
    collection, doc, setDoc, updateDoc,
    addDoc, deleteDoc, getDocs, onSnapshot,
    query, orderBy
} from "firebase/firestore";

export default function useChatManager(userProfile, db) {
    const [messages, setMessages] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(null);

    const createNewConversation = async () => {
        if (!db || !userProfile) return null;
        const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const data = {
            id,
            title: "Cuộc trò chuyện mới",
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
            messageCount: 0,
            userType: userProfile.isAnonymous ? 'anonymous' : 'authenticated'
        };
        await setDoc(doc(db, 'users', userProfile.uid, 'conversations', id), data);
        return id;
    };

    const updateConversationTitle = async (convId, firstMsg) => {
        if (!convId || !db || !userProfile) return;
        const title = firstMsg?.type === 'user'
            ? `Phân tích công thức ${new Date().toLocaleDateString('vi-VN')}`
            : "Cuộc trò chuyện mới";
        await updateDoc(doc(db, 'users', userProfile.uid, 'conversations', convId), {
            title,
            lastMessageAt: Date.now(),
        });
        setConversations(prev =>
            prev.map(c => c.id === convId ? { ...c, title } : c)
        );
    };

    const saveMessage = async (msg, convId = null) => {
        const targetId = convId || currentConversationId;
        if (!db || !userProfile || !targetId) return;

        const ref = collection(db, 'users', userProfile.uid, 'conversations', targetId, 'messages');
        await addDoc(ref, {
            ...msg,
            timestamp: Date.now(),
            userType: userProfile.isAnonymous ? 'anonymous' : 'authenticated'
        });

        const convRef = doc(db, 'users', userProfile.uid, 'conversations', targetId);
        await updateDoc(convRef, {
            lastMessageAt: Date.now(),
            messageCount: messages.length + 1,
        });
    };

    const loadConversations = async () => {
        if (!db || !userProfile) return;
        const q = query(collection(db, 'users', userProfile.uid, 'conversations'), orderBy('lastMessageAt', 'desc'));
        const snapshot = await getDocs(q);
        const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConversations(convs);
        if (!currentConversationId && convs.length > 0) {
            setCurrentConversationId(convs[0].id);
        }
    };

    const loadMessages = (convId) => {
        if (!db || !userProfile || !convId) return () => {};
        const ref = collection(db, 'users', userProfile.uid, 'conversations', convId, 'messages');
        const q = query(ref, orderBy('timestamp'));
        const unsub = onSnapshot(q, snap => {
            setMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    };

    const deleteConversation = async (convId) => {
        if (!db || !userProfile || !convId) return;
        await deleteDoc(doc(db, 'users', userProfile.uid, 'conversations', convId));
        const msgSnap = await getDocs(collection(db, 'users', userProfile.uid, 'conversations', convId, 'messages'));
        await Promise.all(msgSnap.docs.map(doc => deleteDoc(doc.ref)));

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
    };

    useEffect(() => {
        if (userProfile) {
            loadConversations();
        } else {
            setConversations([]);
            setCurrentConversationId(null);
            setMessages([]);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!currentConversationId) return;
        const unsub = loadMessages(currentConversationId);
        return () => unsub?.();
    }, [currentConversationId]);

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
