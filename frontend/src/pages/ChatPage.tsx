import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import CallModal from '../components/CallModal';
import StatusFeed from '../components/StatusFeed';
import { useChatStore } from '../store/chatStore';
import { useSocket } from '../hooks/useSocket';
import { useCall } from '../hooks/useCall';
import type { Message } from '../types/chat';

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const addMessage = useChatStore((state) => state.addMessage);
  const setUserTyping = useChatStore((state) => state.setUserTyping);
  const updateConversationLastMessage = useChatStore((state) => state.updateConversationLastMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const removeMessageContent = useChatStore((state) => state.removeMessageContent);
  const addReaction = useChatStore((state) => state.addReaction);
  const removeReaction = useChatStore((state) => state.removeReaction);
  const conversations = useChatStore((state) => state.conversations);
  const socket = useSocket();

  const call = useCall();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showStatusScreen, setShowStatusScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const getRemoteUserName = () => {
    const targetId = call.incomingCall?.fromUserId ?? call.remoteUserId;
    if (!targetId) return 'Unknown';
    for (const conv of conversations) {
      const participant = conv.participants.find((p) => p.id === targetId);
      if (participant) return participant.name;
    }
    return 'Unknown';
  };

  const handleBack = () => {
    navigate('/');
  };

  const showSidebar = !isMobile || (isMobile && !activeId && !showStatusScreen);
  const showChat = !isMobile || (isMobile && !!activeId);

  return (
    <div className="flex h-[100dvh] bg-black overflow-hidden">
      {showSidebar && (
        <Sidebar onStatusOpen={isMobile ? () => setShowStatusScreen(true) : undefined} />
      )}

      {isMobile && showStatusScreen && (
        <div className="flex-1 flex flex-col h-[100dvh]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            <button onClick={() => setShowStatusScreen(false)} className="p-1 text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h2 className="text-white font-semibold text-lg">Status</h2>
          </div>
          <StatusFeed />
        </div>
      )}

      {showChat ? (
        <ChatWindow
          conversationId={activeId!}
          onStartCall={call.startCall}
          onBack={isMobile ? handleBack : undefined}
        />
      ) : (
        !isMobile && (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a conversation to start chatting
          </div>
        )
      )}

      <CallModal
        callStatus={call.callStatus}
        callError={call.callError}
        onDismissError={call.clearCallError}
        callType={call.callType}
        remoteUserName={getRemoteUserName()}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
        onAccept={call.acceptCall}
        onReject={call.rejectCall}
        onEnd={call.endCall}
        onToggleMute={call.toggleMute}
        onToggleCamera={call.toggleCamera}
      />
    </div>
  );
}
