export interface ConversationParticipant {
  id: number;
  name: string;
  phoneNumber: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
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
  participants: ConversationParticipant[];
  lastMessage: LastMessagePreview | null;
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
}
