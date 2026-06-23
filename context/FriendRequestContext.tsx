import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/AuthContext';
import * as Notifications from 'expo-notifications';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

Notifications.setNotificationHandler({
  handleNotification: async () => {
    console.log('🔔 Handling notification');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

type FollowRequest = {
  id: string;
  follower_id: string; // formerly requester_id
  followed_id: string; // formerly recipient_id
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
};

interface FriendRequestContextType {
  friendRequests: FollowRequest[];
  pendingRequests: FollowRequest[];
  updateRequestStatus: (
    requestId: string,
    status: 'accepted' | 'denied'
  ) => Promise<void>;
  refreshRequests: () => Promise<void>;
}

const FriendRequestContext = createContext<
  FriendRequestContextType | undefined
>(undefined);

export const FriendRequestProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [friendRequests, setFriendRequests] = useState<FollowRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([]);
  const { user } = useAuth();
  const currentUserId = user?.id;

  const fetchRequests = async () => {
    if (!currentUserId) return;

    try {
      // Fetch received follow requests (requests sent to current user)
      // In your FriendRequestProvider file
      const { data: received, error: receivedError } = await supabase
        .from('follow_requests')
        .select(
          `
        *,
        profiles:profiles!follow_requests_follower_id_fkey (
          username,
          avatar_url,
          full_name
        )
        `
        )
        .eq('followed_id', currentUserId)
        .eq('status', 'pending');

      if (receivedError) {
        console.error('Error fetching received requests:', receivedError);
        return;
      }

      // Fetch sent follow requests (requests initiated by current user)
      const { data: sent, error: sentError } = await supabase
        .from('follow_requests')
        .select(
          `
          *,
          profiles!follow_requests_followed_id_fkey (
            username,
            avatar_url,
            full_name
          )
        `
        )
        .eq('follower_id', currentUserId)
        .eq('status', 'pending');

      if (sentError) {
        console.error('Error fetching sent requests:', sentError);
        return;
      }

      console.log('Received requests:', received);
      console.log('Sent requests:', sent);

      setFriendRequests(received || []);
      setPendingRequests(sent || []);
    } catch (error) {
      console.error('Error in fetchRequests:', error);
    }
  };

  const updateRequestStatus = async (
    requestId: string,
    status: 'accepted' | 'denied'
  ) => {
    try {
      const { error } = await supabase
        .from('follow_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      if (status === 'accepted') {
        const request = friendRequests.find((req) => req.id === requestId);
        if (request) {
          // Insert a row into the follows table using new column names
          const { error: insertError } = await supabase.from('follows').insert({
            follower_id: request.follower_id,
            followed_id: request.followed_id,
          });
          if (insertError) {
            throw insertError;
          }
        }
      }

      // Remove the processed request from local state
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('follow-request-changes')
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'follow_requests',
          filter: `followed_id=eq.${currentUserId}`,
        },
        async (payload: RealtimePostgresChangesPayload<FollowRequest>) => {
          console.log('Follow request change:', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const { data, error } = await supabase
              .from('follow_requests')
              .select(
                `
                *,
                profiles!follow_requests_follower_id_fkey (
                  username,
                  avatar_url,
                  full_name
                )
              `
              )
              .eq('id', payload.new.id)
              .single();

            if (!error && data) {
              console.log('Adding new follow request:', data);
              setFriendRequests((prev) => [...prev, data]);
            }
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchRequests();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 Notification received in foreground:', notification);
      }
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('🔔 Notification response:', response);
      });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return (
    <FriendRequestContext.Provider
      value={{
        friendRequests,
        pendingRequests,
        updateRequestStatus,
        refreshRequests: fetchRequests,
      }}
    >
      {children}
    </FriendRequestContext.Provider>
  );
};

export const useFriendRequests = () => {
  const context = useContext(FriendRequestContext);
  if (context === undefined) {
    throw new Error(
      'useFriendRequests must be used within a FriendRequestProvider'
    );
  }
  return context;
};
