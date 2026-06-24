// components/NotificationItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Avatar from './Avatar';
import { LogoWhite } from '@/assets/images';
interface DatabaseProfile {
  id: string;
  username: string;
  avatar_url: string;
  full_name: string | null;
}

export interface NotificationResponse {
  id: string;
  type: 'FOLLOW_REQUEST' | 'MESSAGE' | 'LIKE' | 'TAG' | 'FOLLOWING' | 'BLAHS';
  recipient_id: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  payload: Record<string, any>;
  sender: DatabaseProfile[]; // Profile comes as an array from the join
}

export interface Profile {
  username: string;
  avatar_url: string;
  full_name?: string;
}

export interface NotificationPayload {
  conversationId?: string;
  sender?: Profile;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: 'FOLLOW_REQUEST' | 'MESSAGE' | 'LIKE' | 'TAG' | 'FOLLOWING' | 'BLAHS';
  sender: Profile;
  username: string;
  avatar_url: string;
  created_at: string;
  is_read: boolean;
  payload?: NotificationPayload;
}

interface NotificationItemProps {
  notification: Notification;
  onNotificationPress: (notification: Notification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onNotificationPress,
}) => {
  const router = useRouter();
  const { type, sender, created_at, payload, is_read } = notification;

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm';

    return Math.floor(seconds) + 's';
  };

  const handlePress = () => {
    if (type === 'MESSAGE' && payload?.conversationId) {
      router.push({
        pathname: '/chats/chat-room/[id]',
        params: {
          id: payload.conversationId,
          username: sender.username,
          image: sender.avatar_url,
        },
      });
    }
    if (type === 'FOLLOW_REQUEST') {
      router.push('/friend-requests');
    }
    if (type === 'BLAHS') {
      // D6 → Recovery (MyProfile 8.7): svoj profil, gde se recovery popup auto-otvara
      // dok je ponuda živa ('recoverable').
      router.push('/profile');
    }
    onNotificationPress(notification);
  };

  const renderNotificationContent = () => {
    switch (type) {
      case 'FOLLOW_REQUEST':
        return (
          <View>
            <Text style={styles.notificationText}>
              <Text style={styles.username}>{sender.username}</Text>
              <Text>{sender.full_name} sent you a follow request</Text>
            </Text>
          </View>
        );
      case 'MESSAGE':
        return (
          <>
            <View style={styles.textRow}>
              <Text style={styles.username}>{sender.username}</Text>
              <Text style={styles.timestamp}>{formatTimeAgo(created_at)}</Text>
            </View>
            <Text style={styles.notificationSubtitle}>
              {sender.full_name} sent you a message
            </Text>
          </>
        );
      case 'LIKE':
        return (
          <Text style={styles.notificationText}>
            <Text style={styles.username}>{sender.username}</Text>
            <Text>{sender.full_name} likes your post</Text>
          </Text>
        );
      case 'TAG':
        return (
          <Text style={styles.notificationText}>
            <Text style={styles.username}>{sender.username}</Text>
            <Text> {sender.full_name} tagged you in a post</Text>
          </Text>
        );
      case 'FOLLOWING':
        return (
          <Text style={styles.notificationText}>
            <Text style={styles.username}>{sender.username}</Text>
            <Text> {sender.full_name} is following you now</Text>
          </Text>
        );
      case 'BLAHS':
        return (
          <Text style={styles.notificationText}>
            <Text style={styles.username}>blahblah</Text>
            <Text> Oops! You lost your blahs</Text>
          </Text>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationContainer,
        !is_read && styles.unreadNotification,
      ]}
      onPress={handlePress}
    >
      <View style={styles.avatarContainer}>
        <Avatar url={sender.avatar_url} style={styles.avatar} size={50} />
        <View style={styles.logo}>
          <LogoWhite width={20} height={20} />
        </View>
      </View>

      <View style={styles.contentContainer}>{renderNotificationContent()}</View>
    </TouchableOpacity>
  );
};

// components/NotificationsList.tsx
interface NotificationsListProps {
  notifications: Notification[];
  onNotificationPress: (notification: Notification) => void;
}

export const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  onNotificationPress,
}) => {
  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No notifications yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onNotificationPress={onNotificationPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  textRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logo: {
    backgroundColor: '#FF325E',
    borderRadius: 2,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: -6,
    right: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'InterMedium',
  },
  notificationContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#919191',
    borderRadius: 50,
    alignContent: 'center',
    alignItems: 'center',
  },
  notificationSubtitle: {
    color: '#fff',
    fontFamily: 'InterRegular',
    fontSize: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#B3B3B3',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationText: {
    fontSize: 14,
    color: '#202020',
    marginBottom: 4,
    fontFamily: 'InterRegular',
  },
  username: {
    fontFamily: 'InterSemiBold',
    color: '#fff',
    fontSize: 16,
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  timestamp: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'InterRegular',
    justifyContent: 'flex-end',
    alignContent: 'flex-end',
    textAlign: 'right',
    paddingRight: 10,
  },
});
