import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../hooks/useSocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import type { Message, Conversation } from '../types/chat';

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING: number[] = [];
const REACTION_OPTIONS = ['👍', '❤️', '😂', '😮', '😢'];

function getConversationName(conversation: Conversation | undefined, currentUserId: number | undefined) {
  if (!conversation) return '';
  if (conversation.isGroup) return conversation.groupName || 'Group';
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other?.name || 'Unknown';
}

export default function ChatWindow({ conversationId }: { conversationId: number }) {
  const socket = useSocket();
  const currentUser = useAuthStore((state) => state.user);
  const conversations = useChatStore((state) => state.conversations);
  const messages = useChatStore((state) => state.messages[conversationId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);
  const typingUsers = useChatStore((state) => state.typingUsers[conversationId] ?? EMPTY_TYPING);

  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [reactionPickerFor, setReactionPickerFor] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherTypingUsers = typingUsers.filter((id) => id !== currentUser?.id);

  useEffect(() => {
    api.get(`/conversations/${conversationId}/messages`).then((response) => {
      const fetched: Message[] = response.data.messages || [];
      setMessages(conversationId, fetched.slice().reverse());
    });
  }, [conversationId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || !socket) return;

    socket.emit(
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

    socket.emit('typing:stop', { conversationId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setInput('');
    setReplyingTo(null);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!socket) return;

    socket.emit('typing:start', { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  };

  const startEdit = (message: Message) => {
    setEditingId(message.id);
    setEditText(message.content || '');
  };

  const confirmEdit = (messageId: number) => {
    if (!socket || !editText.trim()) return;
    socket.emit('message:edit', { messageId, content: editText.trim() }, (response: { error?: string }) => {
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
    socket.emit('message:delete', { messageId, forEveryone: true });
  };

  const handleReactionClick = (message: Message, emoji: string) => {
    if (!socket) return;
    const alreadyReacted = message.reactions?.some(
      (r) => r.userId === currentUser?.id && r.emoji === emoji
    );
    if (alreadyReacted) {
      socket.emit('reaction:remove', { messageId: message.id, emoji });
    } else {
      socket.emit('reaction:add', { messageId: message.id, emoji });
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
      socket.emit(
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

    setAudioBlob(null);
  }, [audioBlob, conversationId, replyingTo, socket]);

  return (
    <div className="flex-1 h-screen flex flex-col bg-black">
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
          {getConversationName(conversation, currentUser?.id).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-medium text-sm">
            {getConversationName(conversation, currentUser?.id)}
          </p>
          {otherTypingUsers.length > 0 && (
            <p className="text-emerald-400 text-xs">typing...</p>
          )}
        </div>
      </div>

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
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white/10 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {message.replyToMessage && (
                    <div className="mb-1 px-2 py-1 rounded bg-black/20 border-l-2 border-emerald-300 text-xs opacity-80">
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
                    <audio controls src={message.content} className="rounded" />
                  ) : (
                    <p>{message.content}</p>
                  )}

                  <p className={`text-[10px] mt-1 ${isOwn ? 'text-emerald-100/70' : 'text-gray-400'}`}>
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
                    className="hover:text-emerald-400 text-xs"
                  >
                    ↩
                  </button>
                  <button
                    onClick={() =>
                      setReactionPickerFor(reactionPickerFor === message.id ? null : message.id)
                    }
                    title="React"
                    className="hover:text-emerald-400 text-xs"
                  >
                    +
                  </button>
                  {isOwn && (
                    <>
                      {message.messageType === 'TEXT' && (
                        <button
                          onClick={() => startEdit(message)}
                          title="Edit"
                          className="hover:text-emerald-400 text-xs"
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
                          reacted ? 'bg-emerald-600/30 border border-emerald-500' : 'bg-white/10'
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
          <div className="flex items-center justify-between bg-white/5 border-l-2 border-emerald-500 rounded px-3 py-2 text-sm">
            <div>
              <p className="text-emerald-400 font-medium text-xs">
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
        {isRecording && (
          <span className="text-gray-500 mr-2">
            Recording: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
          </span>
        )}
        {error && <span className="text-red-500 mr-2">{error}</span>}
        <button
          onClick={handleRecordClick}
          className={`bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-3 py-2 rounded-full text-sm ${
            isRecording ? 'bg-red-500 hover:bg-red-400' : ''
          }`}
        >
          {isRecording ? 'Stop' : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M15.975 8.475a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06 0L7.21 10.53a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" />
            <path d="M18.254 4.93a.75.75 0 010 1.06l-3.75 3.75a.75.75 0 01-1.06 0L8.48 8.48a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" />
            <path d="M21.75 9c0-.414-.336-.75-.75-.75H8.25A.75.75 0 007.5 9v6a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75V9z" />
          </svg>}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Type a message"
          className="flex-1 rounded-full bg-white/5 border border-white/10 text-white placeholder-gray-500 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={handleSend}
          className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 rounded-full text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
