import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/utils/supabase';

export const useTypingStatus = (
  currentUserId: string,
  conversationId: string
) => {
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to typing status changes
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'broadcast',
        { event: 'typing' },
        ({ payload }: { payload: { userId: string; isTyping: boolean } }) => {
          if (payload.userId !== currentUserId) {
            setIsOtherUserTyping(payload.isTyping);

            // Clear any existing timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }

            // Set a new timeout to clear typing status
            if (payload.isTyping) {
              typingTimeoutRef.current = setTimeout(() => {
                setIsOtherUserTyping(false);
              }, 3000); // Longer timeout for more stable indication
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Function to broadcast typing status
  const broadcastTypingStatus = useCallback(
    async (isTyping: boolean) => {
      await supabase.channel(`typing-${conversationId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, isTyping },
      });
    },
    [conversationId, currentUserId]
  );

  // Handler for when user is typing with improved debouncing
  const handleTyping = useCallback(() => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set typing status to true immediately
    broadcastTypingStatus(true);

    // Debounce the typing status reset
    debounceTimeoutRef.current = setTimeout(() => {
      broadcastTypingStatus(false);
    }, 2500); // Longer debounce for more stable indication
  }, [broadcastTypingStatus]);

  // Cleanup typing status when unmounting
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      broadcastTypingStatus(false);
    };
  }, [broadcastTypingStatus]);

  return {
    isOtherUserTyping,
    handleTyping,
  };
};
