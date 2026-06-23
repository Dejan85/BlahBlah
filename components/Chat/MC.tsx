import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import type { MessageReaction } from '@/types/chat';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Constants for animations
const MENU_HEIGHT = 40;
const MENU_PADDING = 16;
const MENU_GAP = 8;

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

interface MenuPosition {
  x: number;
  y: number;
}

interface MessageContextMenuProps {
  isVisible: boolean;
  position: MenuPosition;
  onReply: () => void;
  onDelete: () => void;
  isSender: boolean;
}

interface ReactionMenuProps {
  onReaction: (reaction: { emoji: string; name: string }) => void;
  messageReactions?: MessageReaction[];
  currentUserId: string;
  position: MenuPosition;
  onClose: () => void;
  isVisible: boolean;
  isSender: boolean;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  isVisible,
  position,
  onReply,
  onDelete,
  isSender,
}) => {
  if (!isVisible) return null;

  // Calculate position based on sender/receiver
  const menuStyle = isSender
    ? {
        right: SCREEN_WIDTH - position.x - 120, // Offset from message start
        top: position.y - MENU_HEIGHT - MENU_GAP,
      }
    : {
        left: position.x, // Start from message position
        top: position.y - MENU_HEIGHT - MENU_GAP,
      };

  return (
    <View style={[styles.contextMenu, menuStyle]}>
      <TouchableOpacity style={styles.menuItem} onPress={onReply}>
        <Text style={styles.menuText}>Reply</Text>
      </TouchableOpacity>
      {isSender && (
        <TouchableOpacity
          style={[styles.menuItem, styles.deleteItem]}
          onPress={onDelete}
        >
          <Text style={[styles.menuText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const ReactionMenu: React.FC<ReactionMenuProps> = ({
  onReaction,
  position,
  onClose,
  isVisible,
  isSender,
}) => {
  const [showMoreReactions, setShowMoreReactions] = useState(false);

  if (!isVisible) return null;

  // Calculate position based on sender/receiver
  const menuStyle = isSender
    ? {
        right: SCREEN_WIDTH - position.x - 150, // Wider than context menu
        top: position.y - MENU_HEIGHT * 2 - MENU_GAP * 2, // Above context menu
      }
    : {
        left: position.x - MENU_PADDING,
        top: position.y - MENU_HEIGHT * 2 - MENU_GAP * 2,
      };

  return (
    <>
      <View style={[styles.reactionMenu, menuStyle]}>
        {QUICK_REACTIONS.map((reaction) => (
          <TouchableOpacity
            key={reaction.name}
            onPress={() => {
              onReaction(reaction);
              onClose();
            }}
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
      </View>

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
            <Text style={styles.modalTitle}>Reactions</Text>
            <View style={styles.reactionGrid}>
              {[...QUICK_REACTIONS, ...MORE_REACTIONS].map((reaction) => (
                <TouchableOpacity
                  key={reaction.name}
                  onPress={() => {
                    onReaction(reaction);
                    setShowMoreReactions(false);
                    onClose();
                  }}
                  style={styles.modalReactionButton}
                >
                  <Text style={styles.emojiText}>{reaction.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

export const MessageReactions: React.FC<{
  reactions: MessageReaction[];
  messageId: string;
  currentUserId: string;
  isSender: boolean;
}> = ({ reactions, messageId, currentUserId, isSender }) => {
  if (!reactions?.length) return null;

  return (
    <View
      style={[
        styles.reactionsContainer,
        isSender ? styles.senderReactions : styles.receiverReactions,
      ]}
    >
      {reactions.map((reaction) => (
        <View
          key={`${messageId}-${reaction.name}`}
          style={[
            styles.reactionBadge,
            reaction.users.includes(currentUserId) && styles.userReactionBadge,
          ]}
        >
          <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
          <Text style={styles.reactionCount}>{reaction.count}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: MENU_PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    zIndex: 1001,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#000000',
    fontFamily: 'InterMedium',
  },
  deleteItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    marginTop: 4,
  },
  deleteText: {
    color: '#FF325E',
  },
  reactionMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
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
    height: MENU_HEIGHT,
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
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#000',
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
    maxWidth: '70%',
  },
  senderReactions: {
    alignSelf: 'flex-end',
    marginRight: 8,
  },
  receiverReactions: {
    alignSelf: 'flex-start',
    marginLeft: 8,
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
    backgroundColor: '#FFE4E9',
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

export default MessageContextMenu;
