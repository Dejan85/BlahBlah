import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import { Conversation, Message } from '@/types/chat';
import { User } from '@/types';

interface MessageContextType {
  createOrNavigateToChat: (
    currentUserId: string,
    targetUser: User
  ) => Promise<void>;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  sendMessage: (
    content: string,
    conversationId: string,
    senderId: string,
    messageType?: 'text' | 'audio' | 'image' | 'file'
  ) => Promise<void>;
  markConversationAsRead: (
    conversationId: string,
    participantId: string
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setCurrentConversationId: (id: string | null) => Promise<void>;
  uploadAudioFile?: (audioUri: string) => Promise<string>;
  handleReaction: (
    messageId: string,
    reaction: { emoji: string; name: string },
    userId: string
  ) => Promise<void>;
}

// Create context
const MessageContext = createContext<MessageContextType | undefined>(undefined);

// Provider component
export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const [messageSubscription, setMessageSubscription] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<{
    message: Message;
    username: string;
  } | null>(null);
  // Subscribe to messages for a specific conversation
  const subscribeToMessages = (conversationId: string) => {
    return supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [
              ...prev,
              {
                id: payload.new.id,
                text: payload.new.text,
                senderId: payload.new.sender_id,
                created_at: payload.new.created_at,
                messageType: payload.new.message_type,
                is_deleted: payload.new.is_deleted ?? false,
              },
            ]);
          }
        }
      )
      .subscribe();
  };

  const handleReaction = async (
    messageId: string,
    reaction: { emoji: string; name: string },
    userId: string
  ) => {
    try {
      // Check if reaction already exists
      const { data: existingReaction } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('reaction_type', reaction.name)
        .single();

      if (existingReaction) {
        // Remove existing reaction
        const { error: deleteError } = await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('reaction_type', reaction.name);

        if (deleteError) throw deleteError;

        setMessages(
          messages.map((msg) => {
            if (msg.id === messageId && msg.reactions) {
              return {
                ...msg,
                reactions: msg.reactions
                  .map((r) => {
                    if (r.name === reaction.name) {
                      return {
                        ...r,
                        count: r.count - 1,
                        users: r.users.filter((id) => id !== userId),
                      };
                    }
                    return r;
                  })
                  .filter((r) => r.count > 0),
              };
            }
            return msg;
          })
        );
      } else {
        // Add new reaction
        const { error: insertError } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: userId,
            reaction_type: reaction.name,
            reaction_emoji: reaction.emoji,
          });

        if (insertError) throw insertError;

        setMessages(
          messages.map((msg) => {
            if (msg.id === messageId) {
              const existingReactions = msg.reactions || [];
              const existingReactionIndex = existingReactions.findIndex(
                (r) => r.name === reaction.name
              );

              if (existingReactionIndex > -1) {
                const updatedReactions = existingReactions.map((r, index) =>
                  index === existingReactionIndex
                    ? { ...r, count: r.count + 1, users: [...r.users, userId] }
                    : r
                );
                return { ...msg, reactions: updatedReactions };
              }

              return {
                ...msg,
                reactions: [
                  ...existingReactions,
                  {
                    emoji: reaction.emoji,
                    name: reaction.name,
                    count: 1,
                    users: [userId],
                  },
                ],
              };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      throw error;
    }
  };

  // Set current conversation by ID and fetch its messages
  const setCurrentConversationId = async (
    conversationId: string | null
  ): Promise<void> => {
    try {
      if (!conversationId) {
        setCurrentConversation(null);
        setMessages([]);

        if (messageSubscription) {
          await supabase.removeChannel(messageSubscription);
          setMessageSubscription(null);
        }
        return;
      }

      setLoading(true);

      const subscription = subscribeToMessages(conversationId);
      setMessageSubscription(subscription);

      // Fetch conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw new Error('Error fetching conversation');

      setCurrentConversation(convData);

      // Fetch messages with reactions
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select(
          `
          *,
          message_reactions (
            id,
            user_id,
            reaction_type,
            reaction_emoji
          )
        `
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messageError) throw new Error('Error fetching messages');

      const messagesWithReactions: Message[] = messageData.map((msg) => ({
        id: msg.id,
        text: msg.text,
        senderId: msg.sender_id,
        created_at: msg.created_at,
        messageType: msg.message_type,
        is_deleted: msg.is_deleted ?? false,
        reactions:
          msg.message_reactions?.reduce((acc: any[], reaction: any) => {
            const existingReaction = acc.find(
              (r) => r.name === reaction.reaction_type
            );
            if (existingReaction) {
              existingReaction.count += 1;
              existingReaction.users.push(reaction.user_id);
            } else {
              acc.push({
                emoji: reaction.reaction_emoji,
                name: reaction.reaction_type,
                count: 1,
                users: [reaction.user_id],
              });
            }
            return acc;
          }, []) || [],
      }));

      setMessages(messagesWithReactions);
    } catch (err) {
      console.error('Error in setCurrentConversationId:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load conversation'
      );
    } finally {
      setLoading(false);
    }
  };

  const uploadAudioFile = async (audioUri: string): Promise<string> => {
    try {
      // Read the file as base64

      const fileName = `audio-${Date.now()}.m4a`;

      // Convert base64 to blob
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: fileName,
      } as any);

      // Upload using fetch with formData

      const { error } = await supabase.storage
        .from('audio-messages')
        .upload(fileName, formData, {
          contentType: 'audio/m4a',
          cacheControl: '7200',
          upsert: true,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('audio-messages').getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      throw error;
    }
  };

  // Initialize websocket subscriptions and fetch initial data
  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        setLoading(true);

        // Subscribe to conversation changes
        const conversationSubscription = supabase
          .channel('conversation-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'conversations',
            },
            async (payload) => {
              if (payload.eventType === 'INSERT') {
                setConversations((prev) => [
                  ...prev,
                  payload.new as Conversation,
                ]);
              }
            }
          )
          .subscribe();

        setInitialized(true);

        return () => {
          conversationSubscription.unsubscribe();
        };
      } catch (err) {
        console.error('Error initializing messaging:', err);
        setError('Failed to initialize messaging');
      } finally {
        setLoading(false);
      }
    };

    initializeMessaging();
  }, []);

  // Create or navigate to existing chat
  const createOrNavigateToChat = async (
    currentUserId: string,
    targetUser: User
  ) => {
    try {
      if (!initialized) {
        throw new Error('Messaging system not yet initialized');
      }

      setLoading(true);
      setError(null);

      // Sort IDs lexicographically for consistency
      const sorted = [currentUserId, targetUser.id].sort();
      const participant1_id = sorted[0];
      const participant2_id = sorted[1];

      // Check for existing conversation
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(
          `and(participant1_id.eq.${participant1_id},participant2_id.eq.${participant2_id}),` +
            `and(participant1_id.eq.${participant2_id},participant2_id.eq.${participant1_id})`
        )
        .single();

      let conversationId: string;

      if (convError) {
        if (convError.code === 'PGRST116') {
          // No conversation exists, create new one
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({
              participant1_id,
              participant2_id,
            })
            .select()
            .single();

          if (createError || !newConv) {
            throw new Error('Failed to create conversation');
          }

          conversationId = newConv.id;
        } else {
          throw new Error('Error checking conversation');
        }
      } else {
        conversationId = existingConv.id;
      }

      // Set current conversation before navigation
      await setCurrentConversationId(conversationId);

      // Navigate to chat room
      router.push({
        pathname: '/chats/chat-room/[id]',
        params: {
          id: conversationId,
          username: targetUser.username,
          bio: targetUser.bio || '',
          image: targetUser.image,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error in createOrNavigateToChat:', err);
    } finally {
      setLoading(false);
    }
  };
  // Send a message
  // Add this to your sendMessage function in MessageProvider
  const sendMessage = async (
    content: string,
    conversationId: string,
    senderId: string,
    messageType: 'text' | 'audio' | 'image' | 'file' = 'text'
  ) => {
    try {
      if (!initialized) {
        throw new Error('Messaging system not yet initialized');
      }

      setError(null);

      let messageContent = content;
      if (messageType === 'audio') {
        messageContent = await uploadAudioFile(content);
      }

      // Get the conversation to find the recipient
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Determine recipient_id
      const recipientId =
        conversation.participant1_id === senderId
          ? conversation.participant2_id
          : conversation.participant1_id;

      // First send the message
      const { data: newMessage, error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          text: messageContent,
          message_type: messageType,
          reply_to: replyingTo?.message.id || null,
        })
        .select()
        .single();

      if (sendError) {
        console.error('Database error:', sendError);
        throw new Error('Error sending message');
      }

      // Get sender's info for the notification
      const { data: senderProfile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', senderId)
        .single();

      if (profileError) throw profileError;

      // Create notification for the recipient
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: recipientId,
          sender_id: senderId,
          type: 'MESSAGE',
          payload: {
            conversationId,
            messageId: newMessage.id,
            messageContent:
              messageType === 'text' ? messageContent : `Sent a ${messageType}`,
            senderUsername: senderProfile.username,
            senderAvatar: senderProfile.avatar_url,
          },
          is_read: false,
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      setReplyingTo(null);
    } catch (err) {
      console.error('Error in sendMessage:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Mark conversation as read
  const markConversationAsRead = async (
    conversationId: string,
    participantId: string
  ) => {
    try {
      if (!initialized) {
        throw new Error('Messaging system not yet initialized');
      }

      await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError || !conversation) {
        throw new Error('Error fetching conversation');
      }

      // Update participant1_last_read_at or participant2_last_read_at, depending on who is reading
      const updatePayload = {
        [participantId === conversation.participant1_id
          ? 'participant1_last_read_at'
          : 'participant2_last_read_at']: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('conversations')
        .update(updatePayload)
        .eq('id', conversationId);

      if (updateError) {
        console.error('Update error:', updateError);
      }
    } catch (err) {
      console.error('Error in markConversationAsRead:', err);
    }
  };

  const value = {
    createOrNavigateToChat,
    conversations,
    currentConversation,
    messages,
    sendMessage,
    markConversationAsRead,
    loading,
    error,
    initialized,
    setCurrentConversationId,
    setMessages,
    uploadAudioFile,
    handleReaction,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};

// Custom hook to use the message context
export const useMessage = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  return context;
};

export default MessageContext;
