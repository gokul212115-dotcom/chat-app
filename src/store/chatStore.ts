import create from 'zustand';
import { Conversation, Message } from '../types/chat';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: number | null;
  messages: Record<number, Message[]>;
  typingUsers: Record<number, number[]>;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversationId: number | null) => void;
  addMessage: (conversationId: number, message: Message) => void;
  setMessages: (conversationId: number, messages: Message[]) => void;
  setUserTyping: (conversationId: number, userId: number, isTyping: boolean) => void;
  updateConversationLastMessage: (conversationId: number, lastMessage: Message | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},

  setConversations: (conversations) =>
    set(() => ({ conversations })),

  setActiveConversation: (conversationId) =>
    set(() => ({ activeConversationId: conversationId })),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existingMessages = state.messages[conversationId] || [];
      if (!existingMessages.find(msg => msg.id === message.id)) {
        return {
          messages: {
            ...state.messages,
            [conversationId]: [message, ...existingMessages],
          },
        };
      }
      return state;
    }),

  setMessages: (conversationId, messages) =>
    set(() => ({ messages: { ...messages } })),

  setUserTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const typingUsers = state.typingUsers[conversationId] || [];
      if (isTyping && !typingUsers.includes(userId)) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: [...typingUsers, userId],
          },
        };
      } else if (!isTyping) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: typingUsers.filter(id => id !== userId),
          },
        };
      }
      return state;
    }),

  updateConversationLastMessage: (conversationId, lastMessage) =>
    set((state) => {
      const conversations = state.conversations.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, lastMessage };
        }
        return conv;
      });
      return { conversations };
    }),
}));
