export type MessageType = 'text' | 'audio' | 'image' | 'file';

export interface MessageReaction {
  emoji: string;
  name: string;
  count: number;
  users: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  created_at: string;
  messageType: string;
  reactions?: {
    emoji: string;
    name: string;
    count: number;
    users: string[];
  }[];
}

export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  participant1_last_read_at: string | null;
  participant2_last_read_at: string | null;
}
export type RealtimeMessagePayload = {
  new: {
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    created_at: string;
    message_type: string;
  };
  old?: {
    id: string;
  };
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
};

export type RealtimeReactionPayload = {
  new: {
    id: string;
    message_id: string;
    user_id: string;
    reaction_type: string;
    reaction_emoji: string;
  } | null;
  old: {
    id: string;
    message_id: string;
    user_id: string;
    reaction_type: string;
    reaction_emoji: string;
  } | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
};
