import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, findUserByPhone } from '../lib/api';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
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
  const activeConversationId = useChatStore((state) => state.activeConversationId);

  const [showNewChat, setShowNewChat] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    api.get('/conversations').then((response) => {
      setConversations(response.data.conversations || []);
    });
  }, [setConversations]);

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
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">Chats</h2>
        <button
          onClick={() => setShowNewChat((v) => !v)}
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
        >
          + New Chat
        </button>
      </div>

      {showNewChat && (
        <div className="p-4 border-b border-white/10 bg-white/5">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Enter phone number"
            className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchError && (
            <p className="text-red-400 text-xs mt-2">{searchError}</p>
          )}
          <button
            onClick={handleNewChat}
            disabled={isSearching || !phoneInput.trim()}
            className="mt-2 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-sm font-medium py-1.5 rounded-lg"
          >
            {isSearching ? 'Searching...' : 'Start Chat'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8 px-4">
            No conversations yet. Start a new chat above.
          </p>
        )}
        {conversations.map((conversation) => {
          const name = getConversationName(conversation, currentUser?.id);
          const letter = getConversationAvatarLetter(conversation, currentUser?.id);
          const isActive = activeConversationId === conversation.id;

          return (
            <button
              key={conversation.id}
              onClick={() => navigate(`/chat/${conversation.id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${
                isActive ? 'bg-white/10' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {letter}
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
                <p className="text-gray-500 text-xs truncate">
                  {conversation.lastMessage?.content || 'No messages yet'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
