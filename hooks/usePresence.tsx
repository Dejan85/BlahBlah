// hooks/usePresence.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  presenceMessage,
  pickPresenceMessage,
  roundedPresenceLabel,
} from '@/lib/presenceMessages';

interface PresenceState {
  [key: string]: {
    lastSeen: string;
    isOnline: boolean;
  };
}

interface UserPresenceDB {
  user_id: string;
  last_seen: string;
  status: 'online' | 'offline';
  created_at: string;
}

export const usePresence = (currentUserId: string) => {
  const [presenceState, setPresenceState] = useState<PresenceState>({});

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let presenceChannel: RealtimeChannel;

    const updatePresence = async () => {
      try {
        const { error } = await supabase.from('user_presence').upsert(
          {
            user_id: currentUserId,
            last_seen: new Date().toISOString(),
            status: 'online',
          },
          {
            onConflict: 'user_id',
          }
        );

        if (error) throw error;
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const setupPresence = async () => {
      try {
        // First, update the user's presence in the database
        await updatePresence();

        // Create and configure the channel
        presenceChannel = supabase.channel('online-users', {
          config: {
            presence: {
              key: currentUserId,
            },
          },
        });

        // Subscribe to status changes
        presenceChannel
          .on('presence', { event: 'join' }, ({ key }) => {
            setPresenceState((prev) => ({
              ...prev,
              [key]: {
                lastSeen: new Date().toISOString(),
                isOnline: true,
              },
            }));
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            setPresenceState((prev) => ({
              ...prev,
              [key]: {
                lastSeen: new Date().toISOString(),
                isOnline: false,
              },
            }));
          });

        // Track the user's presence
        await presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              online_at: new Date().toISOString(),
              user_id: currentUserId,
            });
          }
        });

        // Set up database listener for presence changes
        const dbChannel = supabase
          .channel('db-presence')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_presence',
            },
            (payload) => {
              if (payload.new) {
                const newData = payload.new as UserPresenceDB;
                setPresenceState((prev) => ({
                  ...prev,
                  [newData.user_id]: {
                    lastSeen: newData.last_seen,
                    isOnline: newData.status === 'online',
                  },
                }));
              }
            }
          )
          .subscribe();

        return () => {
          if (presenceChannel) {
            presenceChannel.unsubscribe();
          }
          if (dbChannel) {
            dbChannel.unsubscribe();
          }
          updateLastSeen(currentUserId);
        };
      } catch (error) {
        console.error('Error setting up presence:', error);
      }
    };

    // Update presence periodically
    const presenceInterval = setInterval(updatePresence, 30000);

    // Initialize presence
    const cleanup = setupPresence();

    // Cleanup function
    return () => {
      clearInterval(presenceInterval);
      if (cleanup) {
        cleanup.then((cleanupFn) => cleanupFn && cleanupFn());
      }
    };
  }, [currentUserId]);

  const updateLastSeen = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_presence')
        .update({
          last_seen: new Date().toISOString(),
          status: 'offline',
        })
        .eq('user_id', userId);

      if (error) throw error;

      setPresenceState((prev) => ({
        ...prev,
        [userId]: {
          lastSeen: new Date().toISOString(),
          isOnline: false,
        },
      }));
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  };

  return {
    getUserPresence: (userId: string) => presenceState[userId],
    presenceState,
  };
};

// Deterministički [0,1) iz stringa (FNV-1a hash). Stabilno po renderu (bez
// flickera od Math.random()), ali se menja kad se promeni `lastSeen` → poruka
// se osvežava na svaki povratak korisnika (presenceMessages.ts B2 pravilo).
const seededRandom = (seed: string): number => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
};

export const formatPresence = (lastSeen: string | null, isOnline: boolean) => {
  if (isOnline) return 'online';
  // Bez poznatog vremena → fallback zona (najdavnije odsutni).
  if (!lastSeen) return pickPresenceMessage('long-gone', seededRandom('long-gone'));

  const elapsedMs = Date.now() - new Date(lastSeen).getTime();
  const message = presenceMessage(elapsedMs, seededRandom(lastSeen));
  const label = roundedPresenceLabel(elapsedMs);
  // <1min → samo poruka (label = „now"); inače „poruka · 5m ago".
  return label === 'now' ? message : `${message} · ${label} ago`;
};
