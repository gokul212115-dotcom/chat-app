import { create } from 'zustand';
import type { Conversation, Message } from '../types/chat';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: Record<number, Message[]>;
  typingUsers: Record<number, number[]>;
  unreadCounts: Record<number, number>;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setConversationArchived: (conversationId: number, isArchived: boolean) => void;
  setActiveConversation: (conversationId: number | null) => void;
  setMessages: (conversationId: number, messages: Message[]) => void;
  addMessage: (conversationId: number, message: Message) => void;
  setUserTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
  updateConversationLastMessage: (conversationId: number, message: Message) => void;
  updateMessage: (conversationId: number, messageId: number, updates: Partial<Message>) => void;
  removeMessageContent: (conversationId: number, messageId: number) => void;
  addReaction: (conversationId: number, messageId: number, userId: number, emoji: string) => void;
  removeReaction: (conversationId: number, messageId: number, userId: number, emoji: string) => void;
  updatePresence: (userId: number, isOnline: boolean, lastSeenAt: string) => void;
  incrementUnread: (conversationId: number) => void;
  clearUnread: (conversationId: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  unreadCounts: {},

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => {
      if (state.conversations.some((c) => c.id === conversation.id)) return state;
      return { conversations: [conversation, ...state.conversations] };
    }),

  setConversationArchived: (conversationId, isArchived) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, isArchived } : c
      ),
    })),


  setActiveConversation: (conversationId) => set({ activeConversationId: conversationId }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      };
    }),

  setUserTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      const next = isTyping
        ? Array.from(new Set([...current, userId]))
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [conversationId]: next } };
    }),

  updateConversationLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                createdAt: message.createdAt,
              },
            }
          : c
      ),
    })),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: existing.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        },
      };
    }),

  removeMessageContent: (conversationId, messageId) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: existing.map((m) =>
            m.id === messageId
              ? { ...m, isDeletedForEveryone: true, content: null }
              : m
          ),
        },
      };
    }),

  addReaction: (conversationId, messageId, userId, emoji) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: existing.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions || [];
            if (reactions.some((r) => r.userId === userId && r.emoji === emoji)) return m;
            return { ...m, reactions: [...reactions, { userId, emoji }] };
          }),
        },
      };
    }),

  removeReaction: (conversationId, messageId, userId, emoji) =>
    set((state) => {
      const existing = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: existing.map((m) => {
            if (m.id !== messageId) return m;
            const reactions = (m.reactions || []).filter(
              (r) => !(r.userId === userId && r.emoji === emoji)
            );
            return { ...m, reactions };
          }),
        },
      };
    }),

  updatePresence: (userId, isOnline, lastSeenAt) =>
    set((state) => ({
      conversations: state.conversations.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.id === userId ? { ...p, isOnline, lastSeenAt } : p
        ),
      })),
    })),

  incrementUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] || 0) + 1,
      },
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
    })),
}));
