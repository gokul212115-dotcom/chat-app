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
  const updateMessage = useChatStore((state) => state.updateMessage);
  const removeMessageContent = useChatStore((state) => state.removeMessageContent);
  const addReaction = useChatStore((state) => state.addReaction);
  const removeReaction = useChatStore((state) => state.removeReaction);
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

    const handleMessageUpdated = (message: Message) => {
      updateMessage(message.conversationId, message.id, message);
    };

    const handleMessageDeleted = (data: { messageId: number; conversationId: number }) => {
      removeMessageContent(data.conversationId, data.messageId);
    };

    const handleReactionAdded = (data: { messageId: number; conversationId: number; userId: number; emoji: string }) => {
      addReaction(data.conversationId, data.messageId, data.userId, data.emoji);
    };

    const handleReactionRemoved = (data: { messageId: number; conversationId: number; userId: number; emoji: string }) => {
      removeReaction(data.conversationId, data.messageId, data.userId, data.emoji);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('reaction:added', handleReactionAdded);
    socket.on('reaction:removed', handleReactionRemoved);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('reaction:added', handleReactionAdded);
      socket.off('reaction:removed', handleReactionRemoved);
    };
  }, [
    socket,
    addMessage,
    updateConversationLastMessage,
    setUserTyping,
    updateMessage,
    removeMessageContent,
    addReaction,
    removeReaction,
  ]);

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
