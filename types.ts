
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  FILE = 'file'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline';
  isAi?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  metadata?: {
    fileName?: string;
    fileSize?: string;
    mimeType?: string;
    previewUrl?: string;
  };
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  unreadCount: number;
  type: 'group' | 'individual';
  participants: string[];
}
