import { useState } from 'react';
import { api, findUserByPhone } from '../lib/api';

interface SelectedMember {
  id: number;
  name: string;
  phoneNumber: string;
}

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: (conversation: any) => void;
}

export default function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const [phoneInput, setPhoneInput] = useState('');
  const [members, setMembers] = useState<SelectedMember[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddMember = async () => {
    setError(null);
    setIsSearching(true);
    try {
      const found = await findUserByPhone(phoneInput.trim());
      if (!found) {
        setError('No user found with that phone number');
        setIsSearching(false);
        return;
      }
      if (members.some((m) => m.id === found.id)) {
        setError('User already added');
        setIsSearching(false);
        return;
      }
      setMembers((prev) => [...prev, { id: found.id, name: found.name, phoneNumber: found.phoneNumber }]);
      setPhoneInput('');
    } catch (err) {
      setError('Failed to find user');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveMember = (id: number) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCreate = async () => {
    if (!groupName.trim() || members.length < 2) return;
    setIsCreating(true);
    setError(null);
    try {
      const response = await api.post('/conversations/create', {
        participantUserIds: members.map((m) => m.id),
        isGroup: true,
        groupName: groupName.trim(),
      });
      onCreated(response.data);
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">New Group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name"
          className="w-full rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 ring-theme-primary"
        />

        <div className="flex gap-2 mb-2">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Add member by phone number"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary"
          />
          <button
            onClick={handleAddMember}
            disabled={isSearching || !phoneInput.trim()}
            className="bg-theme-primary disabled:opacity-50 text-black text-sm font-medium px-3 rounded-lg"
          >
            Add
          </button>
        </div>

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        {members.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-gray-400 text-xs">{members.length} member{members.length !== 1 ? 's' : ''} added</p>
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white text-sm">{member.name}</p>
                  <p className="text-gray-500 text-xs">{member.phoneNumber}</p>
                </div>
                <button onClick={() => handleRemoveMember(member.id)} className="text-gray-500 hover:text-red-400 text-xs">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={isCreating || !groupName.trim() || members.length < 2}
          className="w-full bg-theme-primary disabled:opacity-40 text-black font-semibold py-2 rounded-lg text-sm"
        >
          {isCreating ? 'Creating...' : 'Create Group'}
        </button>
        {members.length < 2 && (
          <p className="text-gray-500 text-xs text-center mt-2">Add at least 2 members to create a group</p>
        )}
      </div>
    </div>
  );
}
