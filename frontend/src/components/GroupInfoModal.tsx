import { useState } from 'react';
import { api, findUserByPhone, getMediaUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Conversation } from '../types/chat';

interface GroupInfoModalProps {
  conversation: Conversation;
  onClose: () => void;
  onUpdated: (conversation: Conversation) => void;
  onLeft: () => void;
}

export default function GroupInfoModal({ conversation, onClose, onUpdated, onLeft }: GroupInfoModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const myMembership = conversation.participants.find((p) => p.id === currentUser?.id);
  const isAdmin = (myMembership as any)?.role === 'ADMIN';

  const handleAddMember = async () => {
    setError(null);
    setIsAdding(true);
    try {
      const found = await findUserByPhone(phoneInput.trim());
      if (!found) {
        setError('No user found with that phone number');
        setIsAdding(false);
        return;
      }
      const response = await api.post(`/conversations/${conversation.id}/members`, {
        userIds: [found.id],
      });
      onUpdated(response.data);
      setPhoneInput('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    setRemovingId(memberId);
    try {
      await api.delete(`/conversations/${conversation.id}/members/${memberId}`);
      const updatedParticipants = conversation.participants.filter((p) => p.id !== memberId);
      onUpdated({ ...conversation, participants: updatedParticipants });
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleLeaveGroup = async () => {
    const confirmed = window.confirm('Are you sure you want to leave this group?');
    if (!confirmed) return;
    setIsLeaving(true);
    try {
      await api.post(`/conversations/${conversation.id}/leave`);
      onLeft();
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Group Info</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-theme-primary flex items-center justify-center text-white mb-2 overflow-hidden">
            {conversation.groupAvatarUrl ? (
              <img src={getMediaUrl(conversation.groupAvatarUrl)} className="w-full h-full object-cover" alt="group" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            )}
          </div>
          <p className="text-white font-semibold">{conversation.groupName}</p>
          <p className="text-gray-500 text-xs">{conversation.participants.length} members</p>
        </div>

        {isAdmin && (
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Add member by phone number"
                className="flex-1 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary"
              />
              <button
                onClick={handleAddMember}
                disabled={isAdding || !phoneInput.trim()}
                className="bg-theme-primary disabled:opacity-50 text-black text-sm font-medium px-3 rounded-lg"
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
        )}

        <div className="space-y-2 mb-6">
          <p className="text-gray-400 text-xs mb-2">Members</p>
          {conversation.participants.map((member) => {
            const memberRole = (member as any).role;
            return (
              <div key={member.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-theme-primary flex items-center justify-center text-white text-xs font-semibold overflow-hidden">
                    {member.avatarUrl ? (
                      <img src={getMediaUrl(member.avatarUrl)} className="w-full h-full object-cover" alt={member.name} />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm">
                      {member.name} {member.id === currentUser?.id && '(You)'}
                    </p>
                    {memberRole === 'ADMIN' && (
                      <p className="text-theme-primary text-[10px]">Admin</p>
                    )}
                  </div>
                </div>
                {isAdmin && member.id !== currentUser?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingId === member.id}
                    className="text-gray-500 hover:text-red-400 text-xs"
                  >
                    {removingId === member.id ? '...' : 'Remove'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleLeaveGroup}
          disabled={isLeaving}
          className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium py-2.5 rounded-lg text-sm"
        >
          {isLeaving ? 'Leaving...' : 'Leave Group'}
        </button>
      </div>
    </div>
  );
}
