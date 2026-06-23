// MessageContextMenu.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface MessageContextMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onReply: () => void;
  onDelete: () => void;
  isSender: boolean;
}

export const MessagetMenu: React.FC<MessageContextMenuProps> = ({
  isVisible,
  position,
  onReply,
  onDelete,
  isSender,
}) => {
  if (!isVisible) return null;

  return (
    <View style={[styles.contextMenu, { top: position.y, left: position.x }]}>
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

// QuotedMessage component to show the reply preview
export const QuotedMessage: React.FC<{
  message: string;
  username: string;
  onCancelReply: () => void;
}> = ({ message, username, onCancelReply }) => {
  return (
    <View style={styles.quotedContainer}>
      <View style={styles.quotedContent}>
        <Text style={styles.quotedUsername}>{username}</Text>
        <Text style={styles.quotedText} numberOfLines={2}>
          {message}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancelReply} style={styles.cancelQuote}>
        <Text style={styles.cancelText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
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
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  deleteText: {
    color: '#FF325E',
  },
  quotedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#FF325E',
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quotedContent: {
    flex: 1,
  },
  quotedUsername: {
    fontSize: 12,
    color: '#FF325E',
    fontFamily: 'InterBold',
  },
  quotedText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'InterRegular',
  },
  cancelQuote: {
    padding: 4,
  },
  cancelText: {
    fontSize: 16,
    color: '#666666',
  },
});
