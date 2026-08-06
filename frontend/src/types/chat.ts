export interface ConversationParticipant {
  id: number;
  name: string;
  phoneNumber: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  blockedByMe?: boolean;
  blockedMe?: boolean;
}

export interface LastMessagePreview {
  id: number;
  content: string | null;
  senderId: number;
  createdAt: string;
}

export interface Conversation {
  id: number;
  isGroup: boolean;
  groupName: string | null;
  groupAvatarUrl?: string | null;
  isArchived?: boolean;
  isMuted?: boolean;
  participants: ConversationParticipant[];
  lastMessage: LastMessagePreview | null;
}

export interface ReplyPreview {
  id: number;
  content: string | null;
  senderName: string;
}

export interface Reaction {
  userId: number;
  emoji: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string | null;
  messageType: string;
  createdAt: string;
  replyToMessageId: number | null;
  replyToMessage?: ReplyPreview | null;
  isEdited: boolean;
  isDeletedForEveryone: boolean;
  reactions?: Reaction[];
}
