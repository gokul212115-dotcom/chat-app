import { useAuthStore } from '../store/authStore';
import { getMediaUrl } from '../lib/api';
import type { Conversation } from '../types/chat';

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

export default function ContactInfoModal({ conversation, onClose }: Props) {
  const currentUser = useAuthStore((state) => state.user);
  const otherParticipant = conversation.participants.find((p) => p.id !== currentUser?.id);

  if (!otherParticipant) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-semibold">Contact Info</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-theme-primary flex items-center justify-center text-white text-2xl font-semibold overflow-hidden mb-3">
            {otherParticipant.avatarUrl ? (
              <img src={getMediaUrl(otherParticipant.avatarUrl)} className="w-full h-full object-cover" alt={otherParticipant.name} />
            ) : (
              otherParticipant.name.charAt(0).toUpperCase()
            )}
          </div>
          <p className="text-white text-lg font-semibold">{otherParticipant.name}</p>
          <p className="text-gray-400 text-sm">{otherParticipant.phoneNumber}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}
