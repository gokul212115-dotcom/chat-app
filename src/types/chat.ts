export interface Contact {
  id: number;
  name: string;
  phoneNumber: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastSeenAt?: Date;
}

export interface Conversation {
  id: number;
  isGroup: boolean;
  groupName?: string;
  participants: Contact[];
  lastMessage: Message | null;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  messageType: 'TEXT';
  replyToMessageId?: number;
  createdAt: Date;
  sender: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
}
