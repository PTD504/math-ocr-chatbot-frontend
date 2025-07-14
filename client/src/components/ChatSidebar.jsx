import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const ChatSidebar = ({ 
    conversations, 
    currentConversationId, 
    onConversationSelect, 
    onNewConversation, 
    onDeleteConversation,
    isOpen,
    onClose,
    onRenameConversation,
    onLogout,
    userProfile,
    getUserInitials
}) => {
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    const formatTimeAgo = (timestamp) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: vi });
        } catch (error) {
            return 'Vừa xong';
        }
    };

    const handleRename = async (conversationId) => {
        const trimmed = editingValue.trim();
        if (trimmed === '' || trimmed.length > 100) {
            alert("Tên đoạn hội thoại không hợp lệ (tối đa 100 ký tự).");
            cancelRename();
            return;
        }

        try {
            await onRenameConversation(conversationId, trimmed);
        } catch (err) {
            alert("Đổi tên thất bại.");
        }

        setEditingTitleId(null);
        setEditingValue('');
    };

    const cancelRename = () => {
        setEditingTitleId(null);
        setEditingValue('');
    };


    const handleDeleteClick = (conversationId, e) => {
        e.stopPropagation();
        setDeleteConfirm(conversationId);
    };

    const confirmDelete = (conversationId) => {
        onDeleteConversation(conversationId);
        setDeleteConfirm(null);
    };

    const cancelDelete = () => {
        setDeleteConfirm(null);
    };

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed lg:relative top-0 left-0 h-full w-80 bg-[#212121] border-r border-[#2c2c2c] z-50
                transform transition-transform duration-300 ease-in-out flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-[#2c2c2c] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {userProfile?.picture ? (
                            <img 
                                src={userProfile.picture} 
                                alt={userProfile.name}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                {getUserInitials(userProfile?.name)}
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-medium text-[#e5e7eb] truncate">
                                {userProfile?.name}
                            </p>
                            <p className="text-xs text-[#a0a0a0]">
                                Đã đăng nhập
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-2 hover:bg-[#2c2c2c] rounded-full transition-colors"
                    >
                        <i className="fas fa-times text-[#a0a0a0]"></i>
                    </button>
                </div>

                {/* New Conversation Button */}
                <div className="p-4">
                    <button
                        onClick={onNewConversation}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-[#2c2c2c] hover:bg-[#3a3a3a] rounded-xl transition-colors group"
                    >
                        <div className="w-8 h-8 bg-[#3a3a3a] group-hover:bg-[#4b4b4b] rounded-full flex items-center justify-center">
                            <i className="fas fa-plus text-[#e5e7eb] text-sm"></i>
                        </div>
                        <span className="text-[#e5e7eb] font-medium">Cuộc trò chuyện mới</span>
                    </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {conversations === null ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#e5e7eb]"></div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="text-center py-8">
                            <i className="fas fa-comments text-[#4b4b4b] text-3xl mb-3"></i>
                            <p className="text-[#a0a0a0] text-sm">Chưa có cuộc trò chuyện nào</p>
                            <p className="text-[#6b6b6b] text-xs mt-1">
                                Tải lên ảnh để bắt đầu trò chuyện
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {conversations.map((conversation) => (
                                <div
                                    key={conversation.id}
                                    className={`
                                        relative group cursor-pointer rounded-xl p-3 transition-all duration-200
                                        ${currentConversationId === conversation.id 
                                            ? 'bg-[#3a3a3a] border border-[#4b4b4b]' 
                                            : 'hover:bg-[#2c2c2c] border border-transparent'
                                        }
                                    `}
                                    onClick={() => onConversationSelect(conversation.id)}
                                >
                                    {deleteConfirm === conversation.id ? (
                                        <div className="space-y-3">
                                            <p className="text-[#e5e7eb] text-sm font-medium">
                                                Xóa cuộc trò chuyện này?
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDelete(conversation.id);
                                                    }}
                                                    className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
                                                >
                                                    Xóa
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelDelete();
                                                    }}
                                                    className="flex-1 px-3 py-1 bg-[#4b4b4b] hover:bg-[#5a5a5a] text-[#e5e7eb] text-sm rounded-md transition-colors"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    {editingTitleId === conversation.id ? (
                                                        <input
                                                            value={editingValue}
                                                            onChange={(e) => setEditingValue(e.target.value)}
                                                            onBlur={() => handleRename(conversation.id)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleRename(conversation.id);
                                                                if (e.key === 'Escape') cancelRename();
                                                            }}
                                                            className="w-full bg-transparent border border-[#4b4b4b] text-[#e5e7eb] text-sm p-1 rounded"
                                                            maxLength={100}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h4
                                                            className="text-[#e5e7eb] font-medium text-sm truncate mb-1 cursor-pointer"
                                                            onDoubleClick={() => {
                                                                setEditingTitleId(conversation.id);
                                                                setEditingValue(conversation.title);
                                                            }}
                                                            title="Nhấp đúp để đổi tên"
                                                        >
                                                            {conversation.title}
                                                        </h4>
                                                    )}

                                                    <div className="flex items-center gap-2 text-xs text-[#a0a0a0]">
                                                        <span>{formatTimeAgo(conversation.lastMessageAt)}</span>
                                                        {conversation.messageCount > 0 && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{conversation.messageCount} tin nhắn</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeleteClick(conversation.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#4b4b4b] rounded transition-all duration-200"
                                                >
                                                    <i className="fas fa-trash text-[#a0a0a0] hover:text-red-400 text-xs"></i>
                                                </button>
                                            </div>
                                            
                                            {/* Active indicator */}
                                            {currentConversationId === conversation.id && (
                                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2c2c2c]">
                    <div className="text-xs text-[#6b6b6b] text-center space-y-2">
                        <div>
                            <p>Math LaTeX Assistant</p>
                            <p className="mt-1">
                                Đã đăng nhập
                            </p>
                        </div>

                        {/* Logout Button */}
                        <div class="flex justify-center">
                            <button
                                onClick={onLogout}
                                className="px-3 py-1 bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md rounded-md text-sm"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatSidebar;