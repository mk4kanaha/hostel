
import React from 'react';
import { User, Chat } from './types';

export const CURRENT_USER: User = {
  id: 'me',
  name: 'Alex Johnson',
  avatar: 'https://picsum.photos/seed/alex/200',
  status: 'online'
};

export const INITIAL_CHATS: Chat[] = [
  {
    id: 'room-101',
    name: 'Room 101 Crew',
    avatar: 'https://picsum.photos/seed/room1/200',
    lastMessage: 'Who took my charger?',
    unreadCount: 2,
    type: 'group',
    participants: ['me', 'user2', 'user3']
  },
  {
    id: 'mess-committee',
    name: 'Mess Committee',
    avatar: 'https://picsum.photos/seed/mess/200',
    lastMessage: 'Chicken dinner tonight!',
    unreadCount: 0,
    type: 'group',
    participants: ['me', 'admin1', 'user5']
  },
  {
    id: 'hostel-ai',
    name: 'Hostel Assistant (AI)',
    avatar: 'https://picsum.photos/seed/ai/200',
    lastMessage: 'I can help with leave applications.',
    unreadCount: 0,
    type: 'individual',
    participants: ['me', 'ai-bot']
  },
  {
    id: 'rahul-p',
    name: 'Rahul Prasad',
    avatar: 'https://picsum.photos/seed/rahul/200',
    lastMessage: 'Project meeting at 5?',
    unreadCount: 5,
    type: 'individual',
    participants: ['me', 'rahul']
  }
];

export const AI_USER: User = {
  id: 'ai-bot',
  name: 'Hostel Assistant',
  avatar: 'https://picsum.photos/seed/ai/200',
  status: 'online',
  isAi: true
};
