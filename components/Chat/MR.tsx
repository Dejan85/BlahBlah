import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';
import type { MessageReaction } from '@/types/chat';

const QUICK_REACTIONS = [
  { emoji: '❤️', name: 'heart' },
  { emoji: '👍', name: 'thumbsup' },
  { emoji: '😂', name: 'laugh' },
];

const MORE_REACTIONS = [
  { emoji: '😮', name: 'wow' },
  { emoji: '😢', name: 'sad' },
  { emoji: '😡', name: 'angry' },
  { emoji: '🎉', name: 'celebrate' },
];

interface ReactionMenuProps {
  onReaction: (reaction: { emoji: string; name: string }) => void;
  messageReactions?: MessageReaction[];
  currentUserId: string;
  position: { x: number; y: number };
  onClose: () => void;
  isVisible: boolean;
}

const ReactionMenu: React.FC<ReactionMenuProps> = ({
  onReaction,
  position,
  onClose,
  isVisible,
}) => {
  const [showMoreReactions, setShowMoreReactions] = useState(false);

  const handleReaction = (reaction: { emoji: string; name: string }) => {
    onReaction(reaction);
    onClose();
    setShowMoreReactions(false);
  };

  if (!isVisible) return null;

  return (
    <View
      style={[
        styles.reactionMenu,
        {
          top: position.y,
          right: 16, // Position from right edge
        },
      ]}
    >
      {QUICK_REACTIONS.map((reaction) => (
        <TouchableOpacity
          key={reaction.name}
          onPress={() => handleReaction(reaction)}
          style={styles.reactionButton}
        >
          <Text style={styles.emojiText}>{reaction.emoji}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        onPress={() => setShowMoreReactions(true)}
        style={styles.moreButton}
      >
        <Text style={styles.moreButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={showMoreReactions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMoreReactions(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMoreReactions(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>More Reactions</Text>
            <View style={styles.reactionGrid}>
              {[...QUICK_REACTIONS, ...MORE_REACTIONS].map((reaction) => (
                <TouchableOpacity
                  key={reaction.name}
                  onPress={() => handleReaction(reaction)}
                  style={styles.modalReactionButton}
                >
                  <Text style={styles.emojiText}>{reaction.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export const MessageReactions: React.FC<{
  reactions: MessageReaction[];
  messageId: string;
  currentUserId: string;
  isSender?: boolean;
}> = ({ reactions, messageId, currentUserId, isSender }) => {
  console.log('MessageReactions render:', {
    reactions,
    messageId,
    currentUserId,
  });

  if (!reactions?.length) {
    console.log('No reactions to display');
    return null;
  }

  return (
    <View style={styles.reactionsContainer}>
      {reactions.map((reaction) => {
        console.log('Rendering reaction:', reaction);
        return (
          <View
            key={`${messageId}-${reaction.name}`}
            style={[
              styles.reactionBadge,
              reaction.users.includes(currentUserId) &&
                styles.userReactionBadge,
              isSender ? styles.senderReactions : styles.receiverReactions,
            ]}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={styles.reactionCount}>{reaction.count}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  reactionMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minHeight: 40,
  },
  senderReactions: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  receiverReactions: {
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  reactionButton: {
    padding: 6,
    marginHorizontal: 2,
  },
  emojiText: {
    fontSize: 20,
  },
  moreButton: {
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    marginLeft: 2,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  moreButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  modalReactionButton: {
    padding: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  reactionBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userReactionBadge: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionEmoji: {
    marginRight: 4,
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: '#666',
  },
});

export default ReactionMenu;
