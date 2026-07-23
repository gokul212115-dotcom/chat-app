import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useChatStore } from '../store/chatStore';
import { useSocket } from '../hooks/useSocket';
import type { Message } from '../types/chat';

export default function ChatPage() {
  const { conversationId } = useParams();
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const addMessage = useChatStore((state) => state.addMessage);
  const setUserTyping = useChatStore((state) => state.setUserTyping);
  const updateConversationLastMessage = useChatStore((state) => state.updateConversationLastMessage);
  const socket = useSocket();

  useEffect(() => {
    setActiveConversation(conversationId ? parseInt(conversationId, 10) : null);
  }, [conversationId, setActiveConversation]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      addMessage(message.conversationId, message);
      updateConversationLastMessage(message.conversationId, message);
    };

    const handleTypingUpdate = (data: { conversationId: number; userId: number; isTyping: boolean }) => {
      setUserTyping(data.conversationId, data.userId, data.isTyping);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:update', handleTypingUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [socket, addMessage, updateConversationLastMessage, setUserTyping]);

  const activeId = conversationId ? parseInt(conversationId, 10) : null;

  return (
    <div className="flex h-screen bg-black">
      <Sidebar />
      {activeId ? (
        <ChatWindow conversationId={activeId} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Select a conversation to start chatting
        </div>
      )}
    </div>
  );
}
