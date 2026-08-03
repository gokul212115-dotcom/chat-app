import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, findUserByPhone, getMediaUrl } from '../lib/api';
import CreateGroupModal from './CreateGroupModal';
import StatusFeed from './StatusFeed';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
function getConversationName(conversation, currentUserId) {
    if (conversation.isGroup)
        return conversation.groupName || 'Group';
    const other = conversation.participants.find((p) => p.id !== currentUserId);
    return other?.name || 'Unknown';
}
function getConversationAvatarLetter(conversation, currentUserId) {
    const name = getConversationName(conversation, currentUserId);
    return name.charAt(0).toUpperCase();
}
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)
        return 'now';
    if (diffMin < 60)
        return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)
        return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
}
export default function Sidebar({ onStatusOpen }) {
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);
    const conversations = useChatStore((state) => state.conversations);
    const setConversations = useChatStore((state) => state.setConversations);
    const addConversation = useChatStore((state) => state.addConversation);
    const setConversationArchived = useChatStore((state) => state.setConversationArchived);
    const activeConversationId = useChatStore((state) => state.activeConversationId);
    const unreadCounts = useChatStore((state) => state.unreadCounts);
    const updatePresence = useChatStore((state) => state.updatePresence);
    const socket = useSocket();
    const [showNewChat, setShowNewChat] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [searchError, setSearchError] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('chats');
    // Notify parent when Status tab is selected (for mobile fullscreen)
    useEffect(() => {
        if (activeTab === 'status' && onStatusOpen)
            onStatusOpen();
    }, [activeTab, onStatusOpen]);
    useEffect(() => {
        api.get('/conversations').then((response) => {
            setConversations(response.data.conversations || []);
        });
    }, [setConversations]);
    useEffect(() => {
        if (!socket)
            return;
        const handlePresenceUpdate = (data) => {
            updatePresence(data.userId, data.isOnline, data.lastSeenAt);
        };
        socket.on('presence:update', handlePresenceUpdate);
        return () => {
            socket.off('presence:update', handlePresenceUpdate);
        };
    }, [socket, updatePresence]);
    const handleNewChat = async () => {
        setSearchError(null);
        setIsSearching(true);
        try {
            const foundUser = await findUserByPhone(phoneInput.trim());
            if (!foundUser) {
                setSearchError('No user found with that phone number');
                setIsSearching(false);
                return;
            }
            const response = await api.post('/conversations/create', {
                participantUserIds: [foundUser.id],
            });
            const conversation = response.data;
            addConversation(conversation);
            setShowNewChat(false);
            setPhoneInput('');
            navigate(`/chat/${conversation.id}`);
        }
        catch (err) {
            setSearchError('Failed to start conversation');
        }
        finally {
            setIsSearching(false);
        }
    };
    return (_jsxs("div", { className: "w-full md:w-80 h-screen md:border-r border-white/10 bg-gray-950 flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-white/10", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex bg-white/5 rounded-lg p-0.5", children: [_jsx("button", { onClick: () => setActiveTab('chats'), className: `px-3 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'chats' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`, children: "Chats" }), _jsx("button", { onClick: () => setActiveTab('status'), className: `px-3 py-1.5 text-sm font-medium rounded-md transition ${activeTab === 'status' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`, children: "Status" })] }), _jsx("button", { onClick: () => navigate('/settings'), className: "text-gray-400 hover:text-white", title: "Settings", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" })] }) })] }), activeTab === 'chats' && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setShowNewChat((v) => !v), className: "text-theme-primary hover:opacity-80 text-sm font-medium", children: "+ New Chat" }), _jsx("button", { onClick: () => setShowCreateGroup(true), className: "text-theme-primary hover:opacity-80 text-sm font-medium", children: "+ Group" })] }))] }), activeTab === 'chats' ? (_jsxs(_Fragment, { children: [showNewChat && (_jsxs("div", { className: "p-4 border-b border-white/10 bg-white/5", children: [_jsx("input", { type: "tel", value: phoneInput, onChange: (e) => setPhoneInput(e.target.value), placeholder: "Enter phone number", className: "w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary" }), searchError && (_jsx("p", { className: "text-red-400 text-xs mt-2", children: searchError })), _jsx("button", { onClick: handleNewChat, disabled: isSearching || !phoneInput.trim(), className: "mt-2 w-full bg-theme-primary disabled:opacity-50 text-black text-sm font-medium py-1.5 rounded-lg", children: isSearching ? 'Searching...' : 'Start Chat' })] })), _jsx("div", { className: "px-4 py-2 border-b border-white/10", children: _jsxs("button", { onClick: () => setShowArchived((v) => !v), className: "text-xs text-gray-400 hover:text-theme-primary flex items-center gap-1", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-3.5 h-3.5", children: [_jsx("polyline", { points: "21 8 21 21 3 21 3 8" }), _jsx("rect", { x: "1", y: "3", width: "22", height: "5" }), _jsx("line", { x1: "10", y1: "12", x2: "14", y2: "12" })] }), showArchived ? 'Back to chats' : `Archived (${conversations.filter(c => c.isArchived).length})`] }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: (() => {
                            const visibleConversations = conversations.filter((c) => (showArchived ? c.isArchived : !c.isArchived));
                            if (visibleConversations.length === 0) {
                                return (_jsx("p", { className: "text-gray-500 text-sm text-center mt-8 px-4", children: showArchived ? 'No archived chats.' : 'No conversations yet. Start a new chat above.' }));
                            }
                            return visibleConversations.map((conversation) => {
                                const name = getConversationName(conversation, currentUser?.id);
                                const letter = getConversationAvatarLetter(conversation, currentUser?.id);
                                const isActive = activeConversationId === conversation.id;
                                const otherParticipant = conversation.participants.find((p) => p.id !== currentUser?.id);
                                const unreadCount = unreadCounts[conversation.id] || 0;
                                return (_jsxs("div", { className: `group flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition ${isActive ? 'bg-white/10' : ''}`, children: [_jsxs("button", { onClick: () => navigate(`/chat/${conversation.id}`), className: "flex items-center gap-3 flex-1 min-w-0 text-left", children: [_jsxs("div", { className: "w-10 h-10 rounded-full flex-shrink-0 relative", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-theme-primary flex items-center justify-center text-white font-semibold overflow-hidden", children: conversation.isGroup ? (conversation.groupAvatarUrl ? (_jsx("img", { src: getMediaUrl(conversation.groupAvatarUrl), className: "w-full h-full object-cover", alt: name })) : (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5", children: [_jsx("path", { d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 00-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 010 7.75" })] }))) : otherParticipant?.avatarUrl ? (_jsx("img", { src: getMediaUrl(otherParticipant.avatarUrl), className: "w-full h-full object-cover", alt: name })) : (letter) }), !conversation.isGroup && otherParticipant?.isOnline && (_jsx("span", { className: "absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950" }))] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-white text-sm font-medium truncate", children: name }), conversation.lastMessage && (_jsx("span", { className: "text-gray-500 text-xs flex-shrink-0 ml-2", children: formatRelativeTime(conversation.lastMessage.createdAt) }))] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-gray-500 text-xs truncate", children: conversation.lastMessage?.content || 'No messages yet' }), unreadCount > 0 && (_jsx("span", { className: "ml-2 flex-shrink-0 rounded-full bg-theme-primary text-black text-xs px-2 py-0.5 font-semibold", children: unreadCount }))] })] })] }), _jsx("button", { onClick: async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    const response = await api.post(`/conversations/${conversation.id}/archive`);
                                                    setConversationArchived(conversation.id, response.data.isArchived);
                                                }
                                                catch (err) {
                                                    console.error('Failed to toggle archive:', err);
                                                }
                                            }, className: "opacity-0 group-hover:opacity-100 text-gray-500 hover:text-theme-primary text-xs flex-shrink-0", title: conversation.isArchived ? 'Unarchive' : 'Archive', children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-4 h-4", children: [_jsx("polyline", { points: "21 8 21 21 3 21 3 8" }), _jsx("rect", { x: "1", y: "3", width: "22", height: "5" }), _jsx("line", { x1: "10", y1: "12", x2: "14", y2: "12" })] }) })] }, conversation.id));
                            });
                        })() }), showCreateGroup && (_jsx(CreateGroupModal, { onClose: () => setShowCreateGroup(false), onCreated: (conversation) => {
                            addConversation(conversation);
                            setShowCreateGroup(false);
                            navigate(`/chat/${conversation.id}`);
                        } }))] })) : (_jsx(StatusFeed, {}))] }));
}
//# sourceMappingURL=Sidebar.js.map