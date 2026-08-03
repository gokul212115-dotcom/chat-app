import { create } from 'zustand';
export const useChatStore = create((set) => ({
    conversations: [],
    activeConversationId: null,
    messages: {},
    typingUsers: {},
    unreadCounts: {},
    setConversations: (conversations) => set({ conversations }),
    addConversation: (conversation) => set((state) => {
        if (state.conversations.some((c) => c.id === conversation.id))
            return state;
        return { conversations: [conversation, ...state.conversations] };
    }),
    setConversationArchived: (conversationId, isArchived) => set((state) => ({
        conversations: state.conversations.map((c) => c.id === conversationId ? { ...c, isArchived } : c),
    })),
    setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),
    setMessages: (conversationId, messages) => set((state) => ({
        messages: { ...state.messages, [conversationId]: messages },
    })),
    addMessage: (conversationId, message) => set((state) => {
        const existing = state.messages[conversationId] || [];
        if (existing.some((m) => m.id === message.id))
            return state;
        return {
            messages: {
                ...state.messages,
                [conversationId]: [...existing, message],
            },
        };
    }),
    setUserTyping: (conversationId, userId, isTyping) => set((state) => {
        const current = state.typingUsers[conversationId] || [];
        const next = isTyping
            ? Array.from(new Set([...current, userId]))
            : current.filter((id) => id !== userId);
        return { typingUsers: { ...state.typingUsers, [conversationId]: next } };
    }),
    updateConversationLastMessage: (conversationId, message) => set((state) => ({
        conversations: state.conversations.map((c) => c.id === conversationId
            ? {
                ...c,
                lastMessage: {
                    id: message.id,
                    content: message.content,
                    senderId: message.senderId,
                    createdAt: message.createdAt,
                },
            }
            : c),
    })),
    updateMessage: (conversationId, messageId, updates) => set((state) => {
        const existing = state.messages[conversationId] || [];
        return {
            messages: {
                ...state.messages,
                [conversationId]: existing.map((m) => m.id === messageId ? { ...m, ...updates } : m),
            },
        };
    }),
    removeMessageContent: (conversationId, messageId) => set((state) => {
        const existing = state.messages[conversationId] || [];
        return {
            messages: {
                ...state.messages,
                [conversationId]: existing.map((m) => m.id === messageId
                    ? { ...m, isDeletedForEveryone: true, content: null }
                    : m),
            },
        };
    }),
    addReaction: (conversationId, messageId, userId, emoji) => set((state) => {
        const existing = state.messages[conversationId] || [];
        return {
            messages: {
                ...state.messages,
                [conversationId]: existing.map((m) => {
                    if (m.id !== messageId)
                        return m;
                    const reactions = m.reactions || [];
                    if (reactions.some((r) => r.userId === userId && r.emoji === emoji))
                        return m;
                    return { ...m, reactions: [...reactions, { userId, emoji }] };
                }),
            },
        };
    }),
    removeReaction: (conversationId, messageId, userId, emoji) => set((state) => {
        const existing = state.messages[conversationId] || [];
        return {
            messages: {
                ...state.messages,
                [conversationId]: existing.map((m) => {
                    if (m.id !== messageId)
                        return m;
                    const reactions = (m.reactions || []).filter((r) => !(r.userId === userId && r.emoji === emoji));
                    return { ...m, reactions };
                }),
            },
        };
    }),
    updatePresence: (userId, isOnline, lastSeenAt) => set((state) => ({
        conversations: state.conversations.map((c) => ({
            ...c,
            participants: c.participants.map((p) => p.id === userId ? { ...p, isOnline, lastSeenAt } : p),
        })),
    })),
    incrementUnread: (conversationId) => set((state) => ({
        unreadCounts: {
            ...state.unreadCounts,
            [conversationId]: (state.unreadCounts[conversationId] || 0) + 1,
        },
    })),
    clearUnread: (conversationId) => set((state) => ({
        unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
    })),
}));
//# sourceMappingURL=chatStore.js.map