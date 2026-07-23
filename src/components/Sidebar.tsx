import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { api } from '../lib/api';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { activeConversationId } = useParams<{ conversationId?: string }>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setConversations = useChatStore((state) => state.setConversations);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    }
  };

  const handleNewChat = async () => {
    const phoneNumber = prompt('Enter phone number:');
    if (!phoneNumber) return;

    try {
      const userResponse = await api.get(`/users/search?phoneNumber=${phoneNumber}`);
      const user = userResponse.data.user;
      if (user) {
        const conversationResponse = await api.post('/conversations/create', { participantUserIds: [user.id] });
        navigate(`/chat/${conversationResponse.data.id}`);
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Failed to create new chat', error);
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white h-screen">
      <button onClick={handleNewChat} className="p-2 border-b border-gray-700">New Chat</button>
      {useChatStore((state) => state.conversations).map(conversation => (
        <div
          key={conversation.id}
          className={`p-2 flex items-center cursor-pointer hover:bg-gray-700 ${activeConversationId === conversation.id.toString() ? 'bg-gray-700' : ''}`}
          onClick={() => {
            setActiveConversation(conversation.id);
            navigate(`/chat/${conversation.id}`);
          }}
        >
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white mr-2">
            {conversation.participants[0].avatarUrl ? (
              <img src={conversation.participants[0].avatarUrl} alt="Avatar" className="rounded-full w-full h-full" />
            ) : (
              conversation.participants[0].name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p>{conversation.isGroup ? conversation.groupName : conversation.participants[0].name}</p>
            {conversation.lastMessage && (
              <p className="text-gray-400 text-sm">
                {conversation.lastMessage.content.length > 20
                  ? `${conversation.lastMessage.content.slice(0, 17)}...`
                  : conversation.lastMessage.content}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
