import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/utils/supabase';

// Define base profile type
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  full_name: string | null;
}

// Define the shape of the Supabase response
interface DatabaseFollow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
  profiles: Profile; // This matches the joined profile data
}

const ProfileFollowers: React.FC = () => {
  const params = useLocalSearchParams();
  const profileId = params.id;
  const router = useRouter();

  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follows')
        .select(
          `
          id,
          follower_id,
          followed_id,
          created_at,
          profiles!follows_follower_id_fkey (
            id,
            username,
            avatar_url,
            bio,
            full_name
          )
        `
        )
        .eq('followed_id', profileId);

      if (error) {
        console.error('Error fetching followers:', error);
        return;
      }

      if (data) {
        // Safely type and transform the data
        const typedData = data as unknown as DatabaseFollow[];
        const followerProfiles = typedData.map((record) => record.profiles);
        setFollowers(followerProfiles);
      }
    } catch (error) {
      console.error('Error in fetchFollowers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileId) {
      fetchFollowers();
    }
  }, [profileId]);

  const handleUserPress = (follower: Profile) => {
    router.push({
      pathname: '/profile/profile-details/[id]',
      params: {
        id: follower.id,
        username: follower.username || '',
        image: follower.avatar_url || '',
        bio: follower.bio || '',
        fullName: follower.full_name || '',
      },
    });
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleUserPress(item)}
    >
      <ExpoImage
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }}
        style={styles.avatar}
        contentFit="cover"
      />
      <View style={styles.infoContainer}>
        <Text style={styles.username}>{item.username}</Text>
        {item.full_name ? (
          <Text style={styles.fullName}>{item.full_name}</Text>
        ) : null}
        {item.bio ? <Text style={styles.bio}>{item.bio}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={{ width: 50 }} />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text>No followers yet.</Text>
        </View>
      ) : (
        <FlashList
          data={followers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={70}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  backText: {
    fontSize: 16,
    color: '#FF325E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  infoContainer: {
    marginLeft: 16,
    justifyContent: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullName: {
    fontSize: 14,
    color: '#666',
  },
  bio: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileFollowers;
