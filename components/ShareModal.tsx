import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import {
  Feather,
  FontAwesome,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import BottomSheet from './BS';
import SearchComponent from './SearchComponent';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  postLink?: string;
}
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
interface Friend {
  id: string;
  name: string;
  image: string;
}
const SEARCH_HEIGHT = 60;
const ShareModal: React.FC<ShareModalProps> = ({ visible, onClose }) => {
  const [friends] = useState<Friend[]>([
    // Your existing friends array...
    // Add more friends for testing scrolling
    ...[...Array(40)].map((_, i) => ({
      id: `${i + 8}`,
      name: `Friend ${i + 8}`,
      image: `https://via.placeholder.com/150/FF69B4/000000?text=${i + 8}`,
    })),
  ]);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(1)).current;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const customSnapPoints = {
    PARTIAL: SCREEN_HEIGHT * 0.5, // 50% of screen height
    FULL: SCREEN_HEIGHT * 0.2, // 20% of screen height
  };
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(
    new Set()
  );
  const [currentSnap, setCurrentSnap] = useState<'closed' | 'partial' | 'full'>(
    'partial'
  );

  const handleSnapChange = (snap: 'closed' | 'partial' | 'full') => {
    setCurrentSnap(snap);
  };

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) {
      return friends;
    }

    const query = searchQuery.toLowerCase();
    return friends.filter((friend) =>
      friend.name.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const renderFriendsGrid = () => {
    const rows = [];
    const rowSize = 4;
    const friendsToDisplay =
      currentSnap === 'partial' ? friends : filteredFriends;
    const displayRows =
      currentSnap === 'partial'
        ? 2
        : Math.ceil(friendsToDisplay.length / rowSize);

    for (let i = 0; i < displayRows; i++) {
      const rowFriends = friendsToDisplay.slice(i * rowSize, (i + 1) * rowSize);

      // Only show the first two rows in partial view
      if (currentSnap === 'partial' && i >= 2) break;

      rows.push(
        <View key={i} style={styles.row}>
          {rowFriends.map(renderFriend)}
        </View>
      );
    }

    // Show "No results" message when search yields no results
    if (currentSnap === 'full' && filteredFriends.length === 0) {
      rows.push(
        <View key="no-results" style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No friends found</Text>
        </View>
      );
    }

    return rows;
  };

  // Animation for search bar
  useEffect(() => {
    if (currentSnap === 'full') {
      Animated.parallel([
        Animated.spring(searchAnimation, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(searchOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(searchAnimation, {
          toValue: -SEARCH_HEIGHT,
          useNativeDriver: true,
        }),
        Animated.timing(searchOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentSnap]);

  const toggleFriendSelection = (friendId: string) => {
    const newSelection = new Set(selectedFriends);
    if (newSelection.has(friendId)) {
      newSelection.delete(friendId);
    } else {
      newSelection.add(friendId);
    }
    setSelectedFriends(newSelection);
  };

  const renderFriend = (friend: Friend) => (
    <TouchableOpacity
      key={friend.id}
      style={[
        styles.friendContainer,
        selectedFriends.has(friend.id) && styles.selectedFriend,
      ]}
      onPress={() => toggleFriendSelection(friend.id)}
    >
      <Image source={{ uri: friend.image }} style={styles.avatar} />
      <Text style={styles.friendName}>{friend.name}</Text>
      {selectedFriends.has(friend.id) && <View style={styles.checkmark} />}
    </TouchableOpacity>
  );

  const renderBottomChildren = (
    <View style={styles.sendRow}>
      <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
        <Ionicons
          name="logo-whatsapp"
          color={'#fff'}
          size={26}
          style={styles.iconLogo}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
        <Ionicons
          name="logo-instagram"
          color={'#fff'}
          size={26}
          style={styles.iconLogo}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
        <Feather
          name="message-circle"
          color={'#fff'}
          size={26}
          style={styles.iconLogo}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
        <MaterialCommunityIcons
          name="facebook-messenger"
          color={'#fff'}
          size={26}
          style={styles.iconLogo}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
        <MaterialCommunityIcons
          name="snapchat"
          color={'#fff'}
          size={26}
          style={styles.iconLogo}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
        <FontAwesome
          name="copy"
          color={'#fff'}
          size={26}
          style={styles.iconLogo}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      initialSnap="partial"
      onSnapChange={handleSnapChange}
      modalStyle={styles.modalContainer}
      isOnBottom={true}
      customSnapPoints={customSnapPoints}
      bottomStyle={styles.bottomStyle}
      bottomChildren={renderBottomChildren}
    >
      <View style={styles.modalContent}>
        <ScrollView
          scrollEnabled={currentSnap === 'full'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {currentSnap === 'full' && (
            <Animated.View
              style={[
                styles.searchWrapper,
                {
                  transform: [{ translateY: searchAnimation }],
                  opacity: searchOpacity,
                },
              ]}
            >
              <SearchComponent
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </Animated.View>
          )}
          <View
            style={
              currentSnap === 'partial'
                ? styles.friendsGridPartial
                : styles.friendsGrid
            }
          >
            {renderFriendsGrid()}
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalContainer: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'green',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  iconButton: {
    borderRadius: 30,
    backgroundColor: '#FF325E',
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  searchWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  scrollContent: {
    paddingVertical: 30,
    paddingBottom: 100,
  },
  line: {
    backgroundColor: '#fff',
    width: 28,
    marginTop: 7,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  bottomStyle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#000',
  },
  noResultsText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'InterMedium',
    opacity: 0.7,
  },
  icon: {
    paddingLeft: 30,
  },
  iconLogo: {
    margin: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingLeft: 20,
    paddingRight: 20,
    borderRadius: 40,
    marginTop: 30,
    paddingVertical: 20,
  },
  linkText: {
    flex: 1,
    marginRight: 10,
    color: '#fff',
    fontSize: 18,
    fontFamily: 'InterMedium',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#000',
  },
  friendsGridPartial: {
    paddingVertical: 0,
    top: -40,
  },
  friendsGrid: {
    justifyContent: 'center',
    paddingVertical: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  friendContainer: {
    alignItems: 'center',
    margin: 10,
    backgroundColor: 'black',
    padding: 5,
  },
  selectedFriend: {
    opacity: 0.8,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 55,

    backgroundColor: 'red',
  },
  friendName: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'InterSemiBold',
  },
  checkmark: {
    position: 'absolute',
    top: 0,
    right: 15,
    backgroundColor: '#FF325E',
    borderRadius: 10,
    width: 9,
    height: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    width: 62,
    height: 62,
    backgroundColor: 'red',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    top: -5,
  },
  moreButtonText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'InterSemiBold',
  },
  sendButton: {
    marginVertical: 30,
    marginRight: 15,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  sendRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ShareModal;
