import type { ChatHoursState } from '@/lib/chatHours';

export interface Conversation {
  id: string;
  username: string;
  image: string;
  bio: string;
}

export interface EnhancedConversation extends Conversation {
  lastMessage?: string;
  lastMessageTime?: string;
  isMessageSeen?: boolean;
  unreadCount?: number;
  isPinned?: boolean;
  isMuted?: boolean;
  /** Chat Hours serija (T3.10 lib/chatHours) — derivira vidljiv „83h" brojač. */
  chatHoursState?: ChatHoursState;
}

interface DBMessage {
  id: string;
  text: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
}
interface DBProfile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
}

export interface DBConversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  participant1_last_read_at: string | null;
  participant2_last_read_at: string | null;
  created_at: string;
  participant1?: DBProfile;
  participant2?: DBProfile;
  messages?: DBMessage[];
  is_muted?: boolean;
  is_pinned?: boolean;
}
