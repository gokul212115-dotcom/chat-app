import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, findUserByPhone, getMediaUrl } from '../lib/api';
import CreateGroupModal from './CreateGroupModal';
import StatusFeed from './StatusFeed';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import type { Conversation } from '../types/chat';

function getConversationName(conversation: Conversation, currentUserId: number | undefined) {
  if (conversation.isGroup) return conversation.groupName || 'Group';
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other?.name || 'Unknown';
}

function getConversationAvatarLetter(conversation: Conversation, currentUserId: number | undefined) {
  const name = getConversationName(conversation, currentUserId);
  return name.charAt(0).toUpperCase();
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export default function Sidebar() {
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'status'>('chats');

  useEffect(() => {
    api.get('/conversations').then((response) => {
      setConversations(response.data.conversations || []);
    });
  }, [setConversations]);

  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (data: { userId: number; isOnline: boolean; lastSeenAt: string }) => {
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
      const conversation: Conversation = response.data;
      addConversation(conversation);
      setShowNewChat(false);
      setPhoneInput('');
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      setSearchError('Failed to start conversation');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-80 h-screen bg-gray-950 border-r border-white/10 flex flex-col">
      {/* Header with tab switcher */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'chats' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
                activeTab === 'status' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Status
            </button>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-400 hover:text-white"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Action buttons for Chats tab */}
        {activeTab === 'chats' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewChat((v) => !v)}
              className="text-theme-primary hover:opacity-80 text-sm font-medium"
            >
              + New Chat
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="text-theme-primary hover:opacity-80 text-sm font-medium"
            >
              + Group
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      {activeTab === 'chats' ? (
        <>
          {showNewChat && (
            <div className="p-4 border-b border-white/10 bg-white/5">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary"
              />
              {searchError && (
                <p className="text-red-400 text-xs mt-2">{searchError}</p>
              )}
              <button
                onClick={handleNewChat}
                disabled={isSearching || !phoneInput.trim()}
                className="mt-2 w-full bg-theme-primary disabled:opacity-50 text-black text-sm font-medium py-1.5 rounded-lg"
              >
                {isSearching ? 'Searching...' : 'Start Chat'}
              </button>
            </div>
          )}
          <div className="px-4 py-2 border-b border-white/10">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs text-gray-400 hover:text-theme-primary flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              {showArchived ? 'Back to chats' : `Archived (${conversations.filter(c => c.isArchived).length})`}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const visibleConversations = conversations.filter((c) => (showArchived ? c.isArchived : !c.isArchived));
              if (visibleConversations.length === 0) {
                return (
                  <p className="text-gray-500 text-sm text-center mt-8 px-4">
                    {showArchived ? 'No archived chats.' : 'No conversations yet. Start a new chat above.'}
                  </p>
                );
              }
              return visibleConversations.map((conversation) => {
                const name = getConversationName(conversation, currentUser?.id);
                const letter = getConversationAvatarLetter(conversation, currentUser?.id);
                const isActive = activeConversationId === conversation.id;
                const otherParticipant = conversation.participants.find((p) => p.id !== currentUser?.id);
                const unreadCount = unreadCounts[conversation.id] || 0;
                return (
                  <div
                    key={conversation.id}
                    className={`group flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition ${
                      isActive ? 'bg-white/10' : ''
                    }`}
                  >
                    <button
                      onClick={() => navigate(`/chat/${conversation.id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-10 h-10 rounded-full flex-shrink-0 relative">
                        <div className="w-10 h-10 rounded-full bg-theme-primary flex items-center justify-center text-white font-semibold overflow-hidden">
                          {conversation.isGroup ? (
                            conversation.groupAvatarUrl ? (
                              <img src={getMediaUrl(conversation.groupAvatarUrl)} className="w-full h-full object-cover" alt={name} />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                <path d="M16 3.13a4 4 0 010 7.75" />
                              </svg>
                            )
                          ) : otherParticipant?.avatarUrl ? (
                            <img src={getMediaUrl(otherParticipant.avatarUrl)} className="w-full h-full object-cover" alt={name} />
                          ) : (
                            letter
                          )}
                        </div>
                        {!conversation.isGroup && otherParticipant?.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-950"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-white text-sm font-medium truncate">{name}</p>
                          {conversation.lastMessage && (
                            <span className="text-gray-500 text-xs flex-shrink-0 ml-2">
                              {formatRelativeTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-500 text-xs truncate">
                            {conversation.lastMessage?.content || 'No messages yet'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="ml-2 flex-shrink-0 rounded-full bg-theme-primary text-black text-xs px-2 py-0.5 font-semibold">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await api.post(`/conversations/${conversation.id}/archive`);
                          setConversationArchived(conversation.id, response.data.isArchived);
                        } catch (err) {
                          console.error('Failed to toggle archive:', err);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-theme-primary text-xs flex-shrink-0"
                      title={conversation.isArchived ? 'Unarchive' : 'Archive'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polyline points="21 8 21 21 3 21 3 8" />
                        <rect x="1" y="3" width="22" height="5" />
                        <line x1="10" y1="12" x2="14" y2="12" />
                      </svg>
                    </button>
                  </div>
                );
              });
            })()}
          </div>

          {showCreateGroup && (
            <CreateGroupModal
              onClose={() => setShowCreateGroup(false)}
              onCreated={(conversation) => {
                addConversation(conversation);
                setShowCreateGroup(false);
                navigate(`/chat/${conversation.id}`);
              }}
            />
          )}
        </>
      ) : (
        <StatusFeed />
      )}
    </div>
  );
}
