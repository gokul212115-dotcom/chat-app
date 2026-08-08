import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { api, uploadFile, getMediaUrl } from '../lib/api';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useCamera } from '../hooks/useCamera';
import CameraModal from '../components/CameraModal';
import type { Message, Conversation } from '../types/chat';
import GroupInfoModal from './GroupInfoModal';
import AttachmentMenu from './AttachmentMenu';
import MessageSearch from './MessageSearch';
import WallpaperPicker from './WallpaperPicker';
import ContactInfoModal from './ContactInfoModal';

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: number[] = [];
const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'];

function getConversationName(conversation: Conversation | undefined, currentUserId: number | undefined) {
  if (!conversation) return '';
  if (conversation.isGroup) return conversation.groupName || 'Group';
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other?.name || 'Unknown';
}

function formatLastSeen(dateString: string | null): string {
  if (!dateString) return 'offline';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString();
}

export default function ChatWindow({
  conversationId,
  onStartCall,
  onBack,
}: {
  conversationId: number;
  onStartCall: (targetUserId: number, conversationId: number, type: 'audio' | 'video') => void;
  onBack?: () => void;
}) {
  const socket = useSocket();
  const currentUser = useAuthStore((state) => state.user);
  const conversations = useChatStore((state) => state.conversations);
  const setConversations = useChatStore((state) => state.setConversations);
  const navigate = useNavigate();
  const messages = useChatStore((state) => state.messages[conversationId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const typingUsers = useChatStore((state) => state.typingUsers[conversationId] ?? EMPTY_TYPING);

  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedByOther, setIsBlockedByOther] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherParticipant = conversation?.participants.find((p) => p.id !== currentUser?.id);
  const otherTypingUsers = typingUsers.filter((id) => id !== currentUser?.id);

  const typingNames = conversation
    ? otherTypingUsers
        .map((id) => conversation.participants.find((p) => p.id === id)?.name)
        .filter(Boolean)
    : [];

  const onlineMembersCount = conversation?.isGroup
    ? conversation.participants.filter((p) => p.id !== currentUser?.id && p.isOnline).length
    : 0;

  useEffect(() => {
    api.get(`/conversations/${conversationId}/messages`).then((response) => {
      const fetched: Message[] = response.data.messages || [];
      setMessages(conversationId, fetched.slice().reverse());
    });
  }, [conversationId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Track real visible viewport height so the chat container resizes when the
  // mobile keyboard opens, instead of the browser scrolling the whole page
  // (which drags the fixed header out of view).
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // vv.height already excludes the keyboard; vv.offsetTop accounts for
      // any address-bar/toolbar shift, which varies by Android/Chrome version.
      setViewportHeight(vv.height + vv.offsetTop);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !socket) return;

    socket?.emit(
      'message:send',
      {
        conversationId,
        content,
        messageType: 'TEXT',
        replyToMessageId: replyingTo?.id ?? null,
      },
      (response: { message?: Message; error?: string }) => {
        if (response?.message) {
          addMessage(conversationId, response.message);
        }
      }
    );

    socket?.emit('typing:stop', { conversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setInput('');
    setReplyingTo(null);
  };

  useEffect(() => {
    if (conversation && !conversation.isGroup && otherParticipant) {
      api.get(`/users/${otherParticipant.id}/blocked`).then(res => {
        setIsBlocked(res.data.blockedByMe);
        setIsBlockedByOther(res.data.blockedMe);
      });
    }
  }, [conversation, otherParticipant]);

  useEffect(() => {
    if (conversation) {
      setIsMuted(conversation.isMuted ?? false);
    }
  }, [conversation]);
  
  useEffect(() => {
    if (conversation) {
      const myPart = conversation.participants.find(p => p.id === currentUser?.id);
      setWallpaper((myPart as any)?.wallpaper || null);
    }
  }, [conversation?.id, currentUser]);
const handleInputChange = (value: string) => {
    setInput(value);
    if (!socket) return;

    socket?.emit('typing:start', { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { conversationId });
    }, 2000);
  };

  const startEdit = (message: Message) => {
    setEditingId(message.id);
    setEditText(message.content || '');
  };

  const confirmEdit = (messageId: number) => {
    if (!socket || !editText.trim()) return;
    socket?.emit('message:edit', { messageId, content: editText.trim() }, (response: { error?: string }) => {
      if (!response?.error) {
        setEditingId(null);
        setEditText('');
      }
    });
  };

  const handleDelete = (messageId: number) => {
    if (!socket) return;
    const confirmed = window.confirm('Delete this message for everyone?');
    if (!confirmed) return;
    socket?.emit('message:delete', { messageId, forEveryone: true });
  };

  const handleReactionClick = (message: Message, emoji: string) => {
    if (!socket) return;
    const alreadyReacted = message.reactions?.some(
      (r) => r.userId === currentUser?.id && r.emoji === emoji
    );
    if (alreadyReacted) {
      socket?.emit('reaction:remove', { messageId: message.id, emoji });
    } else {
      socket?.emit('reaction:add', { messageId: message.id, emoji });
    }
    setReactionPickerFor(null);
  };

  const groupedReactions = (message: Message) => {
    const reactions = message.reactions || [];
    const counts: Record<string, number> = {};
    reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return counts;
  };

  const { isRecording, recordingSeconds, startRecording, stopRecording, audioBlob, error } = useAudioRecorder();

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    if (!audioBlob) return;

    uploadFile(audioBlob).then((response) => {
      socket?.emit(
        'message:send',
        {
          conversationId,
          content: response.url,
          messageType: 'AUDIO',
          replyToMessageId: replyingTo?.id ?? null,
        },
        (response: { message?: Message; error?: string }) => {
          if (response?.message) {
            addMessage(conversationId, response.message);
          }
        }
      );
    }).catch((err) => {
      console.error('Error uploading audio:', err);
    });

  }, [audioBlob, conversationId, replyingTo, socket]);

  const { videoRef, startCamera, stopCamera, capturePhoto } = useCamera();

  const handleCaptureClick = () => {
    setIsCameraModalOpen(true);
    startCamera();
  };

  const handleSendPhoto = (blob: Blob) => {
    uploadFile(blob, 'photo.jpg').then((response) => {
      socket?.emit(
        'message:send',
        {
          conversationId,
          content: response.url,
          messageType: 'IMAGE',
          replyToMessageId: replyingTo?.id ?? null,
        },
        (response: { message?: Message; error?: string }) => {
          if (response?.message) {
            addMessage(conversationId, response.message);
          }
        }
      );
    }).catch((err) => {
      console.error('Error uploading photo:', err);
    });
  };

  const handleGallerySelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('File size too large. Maximum allowed size is 25MB.');
      return;
    }
    uploadFile(file, file.name).then((response) => {
      socket?.emit(
        'message:send',
        {
          conversationId,
          content: response.url,
          messageType: 'IMAGE',
          replyToMessageId: replyingTo?.id ?? null,
        },
        (cb: { message?: Message; error?: string }) => {
          if (cb?.message) {
            addMessage(conversationId, cb.message);
          }
        }
      );
      setReplyingTo(null);
    }).catch((err) => {
      console.error('Error uploading gallery image:', err);
    });
    event.target.value = '';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('File size too large. Maximum allowed size is 25MB.');
      return;
    }

    setIsUploadingFile(true);
    uploadFile(file, file.name).then((response) => {
      socket?.emit(
        'message:send',
        {
          conversationId,
          content: response.url,
          messageType: 'DOCUMENT',
          replyToMessageId: replyingTo?.id ?? null,
        },
        (response: { message?: Message; error?: string }) => {
          if (response?.message) {
            addMessage(conversationId, response.message);
          }
        }
      );
    }).catch((err) => {
      console.error('Error uploading file:', err);
    }).finally(() => {
      setIsUploadingFile(false);
    });
  };

  const handleLocationClick = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket?.emit(
          'message:send',
          {
            conversationId,
            content: `${latitude},${longitude}`,
            messageType: 'LOCATION',
            replyToMessageId: replyingTo?.id ?? null,
          },
          (response: { message?: Message; error?: string }) => {
            if (response?.message) {
              addMessage(conversationId, response.message);
            }
          }
        );
        setReplyingTo(null);
      },
      (error) => {
        alert('Unable to retrieve your location. Please allow location access.');
        console.error(error);
      }
    );
  };

  return (
    <div className="w-full md:flex-1 flex flex-col" style={{
    height: viewportHeight ? `${viewportHeight}px` : '100dvh',
    ...(wallpaper
      ? wallpaper.startsWith('http') || wallpaper.startsWith('/')
        ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
        : { backgroundColor: wallpaper }
      : { backgroundColor: 'black' }),
  }}>
      {isCameraModalOpen && (
        <CameraModal onClose={() => { stopCamera(); setIsCameraModalOpen(false); }} onSend={handleSendPhoto} />
      )}
      {isGroupInfoOpen && conversation && conversation.isGroup && (
        <GroupInfoModal
          conversation={conversation}
          onClose={() => setIsGroupInfoOpen(false)}
          onUpdated={(updated) => {
            setConversations(
              conversations.map((c) => (c.id === updated.id ? updated : c))
            );
          }}
          onLeft={() => {
            setIsGroupInfoOpen(false);
            setConversations(conversations.filter((c) => c.id !== conversation.id));
            navigate('/');
          }}
        />
      )}
      <div
        className={`px-6 py-4 border-b border-white/10 flex items-center gap-3 ${conversation?.isGroup ? 'cursor-pointer hover:bg-white/5' : ''}`}
        onClick={() => conversation?.isGroup && setIsGroupInfoOpen(true)}
      >
        {onBack && (
          <button onClick={onBack} className="mr-2 p-1 text-gray-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-theme-primary flex items-center justify-center text-white font-semibold overflow-hidden">
          {conversation?.isGroup ? (
            conversation.groupAvatarUrl ? (
              <img src={getMediaUrl(conversation.groupAvatarUrl)} className="w-full h-full object-cover" alt="group avatar" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            )
          ) : otherParticipant?.avatarUrl ? (
            <img src={getMediaUrl(otherParticipant.avatarUrl)} className="w-full h-full object-cover" alt="avatar" />
          ) : (
            getConversationName(conversation, currentUser?.id).charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <p className="text-white font-medium text-sm">
            {getConversationName(conversation, currentUser?.id)}
          </p>
          {otherTypingUsers.length > 0 ? (
            <p className="text-theme-primary text-xs">
              {conversation?.isGroup
                ? typingNames.length === 1
                  ? `${typingNames[0]} is typing...`
                  : `${typingNames.join(', ')} are typing...`
                : 'typing...'}
            </p>
          ) : conversation?.isGroup ? (
            <p className="text-gray-500 text-xs">
              {conversation.participants.length} members
              {onlineMembersCount > 0 ? `, ${onlineMembersCount} online` : ''}
            </p>
          ) : conversation && otherParticipant ? (
            isBlocked ? (
              <p className="text-red-400 text-xs">Blocked</p>
            ) : isBlockedByOther ? (
              <p className="text-gray-500 text-xs"></p>
            ) : otherParticipant.isOnline ? (
              <p className="text-theme-primary text-xs">online</p>
            ) : (
              <p className="text-gray-500 text-xs">last seen {formatLastSeen(otherParticipant.lastSeenAt)}</p>
            )
          ) : null}
        </div>
        {conversation && !conversation.isGroup && otherParticipant && (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => onStartCall(otherParticipant.id, conversationId, "audio")}
              className="text-gray-400 hover:text-theme-primary"
              title="Voice call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </button>
            <button
              onClick={() => onStartCall(otherParticipant.id, conversationId, "video")}
              className="text-gray-400 hover:text-theme-primary"
              title="Video call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>

            {/* Three-dot menu */}
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-white p-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-20">
                  <button onClick={() => { setIsWallpaperOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Wallpaper
                  </button>
                  {conversation && !conversation.isGroup && otherParticipant && (
                    <button onClick={async () => {
                      if (isBlocked) { await api.post(`/users/${otherParticipant.id}/unblock`); setIsBlocked(false); }
                      else { await api.post(`/users/${otherParticipant.id}/block`); setIsBlocked(true); }
                      setIsMenuOpen(false);
                    }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      {isBlocked ? "Unblock" : "Block"}
                    </button>
                  )}
                  <button onClick={async () => { await api.post(`/conversations/${conversationId}/clear`); setMessages(conversationId, []); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg> Clear Chat
                  </button>
                  <button onClick={() => { setIsSearchOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search Messages
                  </button>
                  <button onClick={() => { setIsContactInfoOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> View Contact
                  </button>
                  <button onClick={async () => {
                      const res = await api.post(`/conversations/${conversationId}/mute`);
                      setIsMuted(res.data.isMuted);
                      setIsMenuOpen(false);
                    }} className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6"/></svg> {isMuted ? "Unmute" : "Mute"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

            {isSearchOpen && (
        <MessageSearch
          messages={messages}
          onClose={() => setIsSearchOpen(false)}
          onJumpTo={(messageId) => {
            const el = document.getElementById(`msg-${messageId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}
<div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUser?.id;
          const isEditing = editingId === message.id;
          const reactionCounts = groupedReactions(message);

          if (message.isDeletedForEveryone) {
            return (
              <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs px-4 py-2 rounded-2xl text-sm bg-white/5 text-gray-500 italic">
                  This message was deleted
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group`}>
              <div className={`flex items-start gap-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl text-sm relative ${
                    isOwn
                      ? 'bg-theme-primary text-white rounded-br-sm'
                      : 'bg-white/10 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {conversation?.isGroup && !isOwn && (
                    <p className="text-xs font-semibold text-theme-primary mb-1">{message.senderName}</p>
                  )}
                  {message.replyToMessage && (
                    <div className="mb-1 px-2 py-1 rounded bg-black/20 border-l-2 border-theme-primary text-xs opacity-80">
                      <p className="font-medium">{message.replyToMessage.senderName}</p>
                      <p className="truncate">{message.replyToMessage.content}</p>
                    </div>
                  )}

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEdit(message.id);
                        }}
                        className="bg-black/30 text-white text-sm rounded px-2 py-1 flex-1 focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => confirmEdit(message.id)} className="text-white">
                        ✓
                      </button>
                    </div>
                  ) : message.messageType === 'AUDIO' ? (
                    <audio controls src={getMediaUrl(message.content)} className="rounded" />
                  ) : message.messageType === 'IMAGE' ? (
                    <img src={getMediaUrl(message.content)} className="rounded-lg max-w-xs cursor-pointer" onClick={() => window.open(getMediaUrl(message.content), '_blank')} />
                  ) : message.messageType === 'DOCUMENT' ? (
                    <a href={getMediaUrl(message.content)} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 bg-white/10 rounded px-3 py-2 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M14.6 7l-.8-3.6L9 5.2l3.6.8zm-1.5 9H6v-2h5.9c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5z" />
                        <path d="M19 4h-3.5c0-.8-.7-1.5-1.5-1.5S12 2.7 12 3.5v.6H8.5C7.7 4 7 4.7 7 5.5s.7 1.5 1.5 1.5H9v10c0 .3-.2.5-.5.5s-.5-.2-.5-.5V6h5v9c0 .3.2.5.5.5s.5-.2.5-.5v-10h1.5c.8 0 1.5.7 1.5 1.5S20.8 4 20 4z" />
                      </svg>
                      <span>{message.content?.split('/').pop()}</span>
                    </a>
                  ) : message.messageType === 'LOCATION' ? (
                    (() => {
                      const [lat, lng] = (message.content || '').split(',');
                      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                      const staticMapUrl = `https://tile.openstreetmap.org/15/${Math.floor((parseFloat(lng) + 180) / 360 * Math.pow(2, 15))}/${Math.floor((1 - Math.log(Math.tan(parseFloat(lat) * Math.PI / 180) + 1 / Math.cos(parseFloat(lat) * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, 15))}.png`;
                      return (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden bg-white/5">
                          <div className="relative w-full h-40 bg-gray-800 flex items-center justify-center overflow-hidden">
                            <img src={staticMapUrl} alt="Location" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="relative z-10 text-red-500">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 drop-shadow-lg">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
                              </svg>
                            </div>
                          </div>
                          <div className="bg-white/10 px-3 py-1.5 text-xs flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            Open in Google Maps
                          </div>
                        </a>
                      );
                    })()
                  ) : (
                    <p>{message.content}</p>
                  )}

                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {message.isEdited && ' · edited'}
                  </p>
                </div>

                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-center text-gray-400">
                  <button
                    onClick={() => setReplyingTo(message)}
                    title="Reply"
                    className="hover:text-theme-primary text-xs"
                  >
                    ↩
                  </button>
                  <button
                    onClick={() =>
                      setReactionPickerFor(reactionPickerFor === message.id ? null : message.id)
                    }
                    title="React"
                    className="hover:text-theme-primary text-xs"
                  >
                    +
                  </button>
                  {isOwn && (
                    <>
                      {message.messageType === 'TEXT' && (
                        <button
                          onClick={() => startEdit(message)}
                          title="Edit"
                          className="hover:text-theme-primary text-xs"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(message.id)}
                        title="Delete"
                        className="hover:text-red-400 text-xs"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>

              {reactionPickerFor === message.id && (
                <div className="flex gap-1 mt-1 bg-white/10 rounded-full px-2 py-1">
                  {REACTION_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(message, emoji)}
                      className="hover:scale-125 transition-transform text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {Object.keys(reactionCounts).length > 0 && (
                <div className="flex gap-1 mt-1">
                  {Object.entries(reactionCounts).map(([emoji, count]) => {
                    const reacted = message.reactions?.some(
                      (r) => r.userId === currentUser?.id && r.emoji === emoji
                    );
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReactionClick(message, emoji)}
                        className={`text-xs rounded-full px-2 py-0.5 flex items-center gap-1 ${
                          reacted ? 'bg-theme-primary/30 border border-theme-primary' : 'bg-white/10'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-gray-300">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {replyingTo && (
        <div className="px-6 pt-2">
          <div className="flex items-center justify-between bg-white/5 border-l-2 border-theme-primary rounded px-3 py-2 text-sm">
            <div>
              <p className="text-theme-primary font-medium text-xs">
                Replying to {replyingTo.senderId === currentUser?.id ? 'yourself' : replyingTo.senderName}
              </p>
              <p className="text-gray-400 truncate">{replyingTo.content}</p>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white ml-3">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
        {/* hidden file inputs stay mounted regardless of recording state */}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          data-gallery="true"
          onChange={handleGallerySelect}
          className="hidden"
        />
        {isRecording ? (
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="text-red-400 text-sm whitespace-nowrap">
              ● Recording: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
            <button
              onClick={handleRecordClick}
              className="ml-auto bg-red-500 hover:bg-red-400 text-white font-semibold px-4 py-2 rounded-full text-sm whitespace-nowrap"
            >
              Stop &amp; Send
            </button>
          </div>
        ) : (
          <>
            {error && <span className="text-red-500 mr-2">{error}</span>}
            <button
              onClick={handleRecordClick}
              className="bg-theme-primary text-black font-semibold px-3 py-2 rounded-full text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3z" />
                <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
              </svg>
            </button>
            {isUploadingFile && (
              <span className="text-gray-500 mr-2">Uploading...</span>
            )}
            <AttachmentMenu
              onCameraClick={handleCaptureClick}
              onGalleryClick={() => (document.querySelector('input[data-gallery="true"]') as HTMLInputElement).click()}
              onDocumentClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement).click()}
              onLocationClick={handleLocationClick}
            />
          </>
        )}
        {!isRecording && (isBlocked ? (
          <div className="flex-1 text-gray-400 text-sm text-center py-2">
            You blocked this user. Unblock to send messages.
          </div>
        ) : (
          <>
            <input
              type="text"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Type a message"
              className="flex-1 rounded-full bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-2 text-sm focus:outline-none focus:ring-2 ring-theme-primary"
            />
            <button
              onClick={handleSend}
              className="bg-theme-primary text-black font-semibold px-5 py-2 rounded-full text-sm"
            >
              Send
            </button>
          </>
        ))}
      </div>
      {isContactInfoOpen && conversation && !conversation.isGroup && (
        <ContactInfoModal
          conversation={conversation}
          onClose={() => setIsContactInfoOpen(false)}
        />
      )}
      {isWallpaperOpen && (
        <WallpaperPicker
          conversationId={conversationId}
          currentWallpaper={wallpaper}
          onClose={() => setIsWallpaperOpen(false)}
          onSelect={(wp) => {
                    setWallpaper(wp);
                    // Update the conversation in the store so wallpaper persists after close/reopen
                    const convos = useChatStore.getState().conversations;
                    const updated = convos.map(c => {
                      if (c.id === conversationId) {
                        return {
                          ...c,
                          participants: c.participants.map(p =>
                            p.id === currentUser?.id ? { ...p, wallpaper: wp } : p
                          ),
                        };
                      }
                      return c;
                    });
                    useChatStore.getState().setConversations(updated);
                  }}
        />
      )}
    </div>
  );
}
