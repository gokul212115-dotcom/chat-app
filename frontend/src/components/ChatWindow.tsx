import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import type { Message, Conversation } from '../types/chat';

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: number[] = [];

function getConversationName(conversation: Conversation | undefined, currentUserId: number | undefined) {
  if (!conversation) return '';
  if (conversation.isGroup) return conversation.groupName || 'Group';
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other?.name || 'Unknown';
}

export default function ChatWindow({ conversationId }: { conversationId: number }) {
  const socket = useSocket();
  const currentUser = useAuthStore((state) => state.user);
  const conversations = useChatStore((state) => state.conversations);
  const messages = useChatStore((state) => state.messages[conversationId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const typingUsers = useChatStore((state) => state.typingUsers[conversationId] ?? EMPTY_TYPING);

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherTypingUsers = typingUsers.filter((id) => id !== currentUser?.id);

  useEffect(() => {
    api.get(`/conversations/${conversationId}/messages`).then((response) => {
      const fetched: Message[] = response.data.messages || [];
      setMessages(conversationId, fetched.slice().reverse());
    });
  }, [conversationId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !socket) return;

    socket.emit(
      'message:send',
      { conversationId, content, messageType: 'TEXT', replyToMessageId: null },
      (response: { message?: Message; error?: string }) => {
        if (response?.message) {
          addMessage(conversationId, response.message);
        }
      }
    );

    socket.emit('typing:stop', { conversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setInput('');
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!socket) return;

    socket.emit('typing:start', { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  };

  return (
    <div className="flex-1 h-screen flex flex-col bg-black">
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
          {getConversationName(conversation, currentUser?.id).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium text-sm">
            {getConversationName(conversation, currentUser?.id)}
          </p>
          {otherTypingUsers.length > 0 && (
            <p className="text-emerald-400 text-xs">typing...</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUser?.id;
          return (
            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? 'bg-emerald-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-gray-100 rounded-bl-sm'
                }`}
              >
                <p>{message.content}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-emerald-100/70' : 'text-gray-400'}`}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Type a message"
          className="flex-1 rounded-full bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={handleSend}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 rounded-full text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
