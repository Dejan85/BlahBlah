import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Comment, Like, Share } from '@/assets/images';
import ShareModal from './ShareModal';
import CommentModal from './CommentModal';

interface PostActionsProps {
  postId: string;
  isShareModalVisible: boolean;
  isCommentModalVisible: boolean;
  onOpenShareModal: () => void;
  onCloseShareModal: () => void;
  onOpenCommentModal: () => void;
  onCloseCommentModal: () => void;
  likes: number | null | undefined;
  isLiked: boolean;
  onLike: () => void;
  hideLikes?: boolean;
  hideShares?: boolean;
  hideComments?: boolean;
  commentCount: number; // Added commentCount prop
}

const PostActions: React.FC<PostActionsProps> = ({
  isShareModalVisible,
  isCommentModalVisible,
  onOpenShareModal,
  onCloseShareModal,
  onOpenCommentModal,
  onCloseCommentModal,
  likes,
  isLiked,
  onLike,
  postId,
  hideLikes = false,
  hideShares = false,
  hideComments = false,
  commentCount,
}) => {
  const scaleValue = new Animated.Value(1);

  const handleLike = () => {
    if (!isLiked) {
      Animated.timing(scaleValue, {
        toValue: 1.5,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          easing: Easing.ease,
          useNativeDriver: true,
        }).start();
      });
    }
    onLike();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  const iconStyle = {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: 'transparent',
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleLike}
        style={!hideLikes ? styles.actionButton : styles.actionButtonNoText}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            { transform: [{ scale: scaleValue }] },
            hideLikes && { marginRight: 0 },
          ]}
        >
          <Like fill={isLiked ? 'red' : 'white'} style={iconStyle} />
        </Animated.View>
        {!hideLikes && likes !== null && likes !== undefined && (
          <Text style={styles.actionText}>{formatNumber(likes)}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        style={!hideShares ? styles.actionButton : styles.actionButtonNoText}
        onPress={onOpenShareModal}
      >
        <View style={[styles.iconWrapper, hideShares && { marginRight: 0 }]}>
          <Share style={iconStyle} />
        </View>
        {!hideShares && (
          <Text style={styles.actionText}>{formatNumber(1200)}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        style={!hideComments ? styles.actionButton : styles.actionButtonNoText}
        onPress={onOpenCommentModal}
      >
        <View style={[styles.iconWrapper, hideComments && { marginRight: 0 }]}>
          <Comment style={iconStyle} />
        </View>
        {!hideComments && (
          <Text style={styles.actionText}>{formatNumber(commentCount)}</Text>
        )}
      </TouchableOpacity>

      <ShareModal
        visible={isShareModalVisible}
        onClose={onCloseShareModal}
        postLink={`https://yourapp.com/posts/${postId}`}
      />
      <CommentModal
        visible={isCommentModalVisible}
        onClose={onCloseCommentModal}
        postId={postId}
      />
    </View>
  );
};

// Styles remain the same...

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
    top: '40%',
    right: 15,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'transparent', // Add this

    // Add shadow to container
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    padding: 8, // Add padding for better touch area
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
    borderRadius: 20, // Rounded corners
    minWidth: 80, // Minimum width for consistency
  },
  actionButtonNoText: {
    flexDirection: 'row',

    marginVertical: 20,
    padding: 10,
    right: 0,
    left: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
    borderRadius: 20, // Rounded corners

    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: 'transparent', // Add this
  },
  actionText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'InterBold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default PostActions;
