import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { api } from '../lib/api';
import { useSocket } from '../hooks/useSocket';

const ChatWindow: React.FC = () => {
  const { conversationId: conversationIdStr } = useParams<{ conversationId?: string }>();
  const conversationId = conversationIdStr ? parseInt(conversationIdStr, 10) : null;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socket = useSocket();
  const { messages, addMessage, setMessages } = useChatStore();

  useEffect(() => {
    if (isAuthenticated && conversationId) {
      fetchMessages();
    }
  }, [isAuthenticated, conversationId]);

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`);
      setMessages(conversationId, response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversationId || !socket) return;

    try {
      socket.emit('message:send', { conversationId, content: inputValue, messageType: 'TEXT', replyToMessageId: null }, (ack) => {
        if (ack.error) {
          console.error('Failed to send message', ack.error);
        }
      });

      addMessage(conversationId, {
        id: Date.now(),
        conversationId,
        senderId: useAuthStore.getState().user?.id || 0,
        content: inputValue,
        messageType: 'TEXT',
        createdAt: new Date(),
        sender: { id: useAuthStore.getState().user?.id || 0, name: useAuthStore.getState().user?.name || '', avatarUrl: useAuthStore.getState().user?.avatarUrl },
      });

      setInputValue('');
    } catch (error) {
      console.error('Failed to send message', error);
    }
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('message:new', (newMessage) => {
      addMessage(newMessage.conversationId, newMessage);
      useChatStore.getState().updateConversationLastMessage(newMessage.conversationId, newMessage);
    });

    socket.on('typing:update', ({ conversationId, userId, isTyping }) => {
      useChatStore.getState().setUserTyping(conversationId, userId, isTyping);
    });

    return () => {
      if (socket) {
        socket.off('message:new');
        socket.off('typing:update');
      }
    };
  }, [socket]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (!socket || !conversationId) return;

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing:start', { conversationId });
    }, 1000);
  };

  let typingTimeout: NodeJS.Timeout | null = null;

  useEffect(() => {
    const handleTypingStop = () => {
      if (!socket || !conversationId) return;
      socket.emit('typing:stop', { conversationId });
    };

    window.addEventListener('beforeunload', handleTypingStop);

    return () => {
      window.removeEventListener('beforeunload', handleTypingStop);
      clearTimeout(typingTimeout);
      if (socket && conversationId) {
        socket.emit('typing:stop', { conversationId });
      }
    };
  }, [socket, conversationId]);

  if (!conversationId || !isAuthenticated) {
    return <div className="flex items-center justify-center h-full">Select a conversation to start chatting</div>;
  }

  const typingUsers = useChatStore((state) => state.typingUsers[conversationId] || []);
  const activeUser = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col flex-grow bg-gray-900">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold">Conversation</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        {messages[conversationId]?.map((message) => (
          <div
            key={message.id}
            className={`mb-2 ${message.senderId === activeUser?.id ? 'ml-auto' : ''}`}
          >
            <div
              className={`p-3 rounded-lg ${
                message.senderId === activeUser?.id ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-white'
              }`}
            >
              {message.content}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(message.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-800 p-4 flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-grow bg-gray-800 text-white p-2 rounded-l-lg focus:outline-none"
        />
        <button
          onClick={handleSendMessage}
          className="bg-emerald-500 text-white p-2 rounded-r-lg hover:bg-emerald-600"
        >
          Send
        </button>
      </div>
      {typingUsers.length > 0 && (
        <div className="p-4 bg-gray-800 text-sm">
          {typingUsers.map(userId => {
            const user = useChatStore.getState().conversations.find(conv =>
              conv.participants.some(participant => participant.id === userId)
            )?.participants.find(participant => participant.id === userId);
            return user ? `${user.name} is typing...` : null;
          }).filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
