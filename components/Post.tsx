import React, { useState, useEffect, useCallback } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { PostUserInfo } from './PostUserInfo';
import PostActions from './PostActions';
import { FeedItem } from '@/types';
import { supabase } from '@/utils';
import { useAuth } from '@/context/AuthContext';
const { height, width } = Dimensions.get('window');
const Post = React.memo(
  ({
    item,
    isOwnProfile,
  }: {
    item: FeedItem;
    index: number;
    isVisible: boolean;
    isOwnProfile?: boolean;
  }) => {
    const { user } = useAuth();
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isShareModalVisible, setIsShareModalVisible] = useState(false);
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [commentCount, setCommentCount] = useState(0);

    const [postSettings, setPostSettings] = useState({
      hideLikes: false,
      hideShares: false,
      hideComments: false,
    });

    const fetchCommentCount = useCallback(async () => {
      try {
        // Get main comments count
        const { count: mainCommentsCount, error: mainError } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('post_id', item.id)
          .eq('is_deleted', false);

        if (mainError) throw mainError;

        // Get all comment IDs for this post
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select('id')
          .eq('post_id', item.id)
          .eq('is_deleted', false);

        if (commentsError) throw commentsError;

        // Get replies count if there are any comments
        let repliesCount = 0;
        if (comments && comments.length > 0) {
          const commentIds = comments.map((comment) => comment.id);
          const { count: repliesTotal, error: repliesError } = await supabase
            .from('comment_replies')
            .select('id', { count: 'exact', head: true })
            .eq('is_deleted', false)
            .in('comment_id', commentIds);

          if (repliesError) throw repliesError;
          repliesCount = repliesTotal || 0;
        }

        // Update total count
        setCommentCount((mainCommentsCount || 0) + repliesCount);
      } catch (error) {
        console.error('Error fetching comment count:', error);
      }
    }, [item.id]);

    // Set up comment count subscriptions
    useEffect(() => {
      fetchCommentCount();

      // Subscribe to main comments
      const commentsSubscription = supabase
        .channel('comments-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${item.id}`,
          },
          () => {
            fetchCommentCount();
          }
        )
        .subscribe();

      // Subscribe to comment replies
      const repliesSubscription = supabase
        .channel('replies-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comment_replies',
            filter: `comment_id=in.(${getCommentIds()})`,
          },
          () => {
            fetchCommentCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(commentsSubscription);
        supabase.removeChannel(repliesSubscription);
      };
    }, [item.id, fetchCommentCount]);

    // Helper function to get comment IDs for the current post
    const getCommentIds = async () => {
      try {
        const { data: comments } = await supabase
          .from('comments')
          .select('id')
          .eq('post_id', item.id)
          .eq('is_deleted', false);

        return comments?.map((comment) => comment.id).join(',') || '';
      } catch (error) {
        console.error('Error getting comment IDs:', error);
        return '';
      }
    };

    // Fetch initial likes count and liked status
    useEffect(() => {
      const fetchLikesData = async () => {
        try {
          // Get likes count
          const { data: likesData, error: likesError } = await supabase.rpc(
            'get_post_likes_count',
            { post_id: item.id }
          );

          if (likesError) throw likesError;
          setLikesCount(likesData || 0);

          // Check if current user has liked the post
          if (user?.id) {
            const { data: hasLiked, error: likedError } = await supabase.rpc(
              'has_user_liked_post',
              {
                post_id: item.id,
                user_id: user.id,
              }
            );

            if (likedError) throw likedError;
            setIsLiked(hasLiked || false);
          }
        } catch (error) {
          console.error('Error fetching likes data:', error);
        }
      };

      fetchLikesData();
    }, [item.id, user?.id]);

    // Handle like/unlike action
    const handleLike = async () => {
      if (!user?.id) return;

      try {
        if (isLiked) {
          // Remove like
          const { error } = await supabase.from('post_likes').delete().match({
            post_id: item.id,
            profile_id: user.id,
          });

          if (error) throw error;
          setLikesCount((prev) => prev - 1);
        } else {
          // Add like
          const { error } = await supabase.from('post_likes').insert({
            post_id: item.id,
            profile_id: user.id,
          });

          if (error) throw error;
          setLikesCount((prev) => prev + 1);
        }

        setIsLiked(!isLiked);
      } catch (error) {
        console.error('Error handling like:', error);
        // Revert optimistic update if error occurs
        setIsLiked((prev) => !prev);
        setLikesCount((prev) => (isLiked ? prev + 1 : prev - 1));
      }
    };

    // Set up realtime subscription for likes
    useEffect(() => {
      const likesSubscription = supabase
        .channel(`post-${item.id}-likes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'post_likes',
            filter: `post_id=eq.${item.id}`,
          },
          async () => {
            // Refresh likes count
            const { data } = await supabase.rpc('get_post_likes_count', {
              post_id: item.id,
            });
            setLikesCount(data || 0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(likesSubscription);
      };
    }, [item.id]);

    // Fetch post settings
    useEffect(() => {
      const fetchPostSettings = async () => {
        if (item.id) {
          const { data, error } = await supabase
            .from('posts')
            .select('hide_likes, hide_shares, hide_comments')
            .eq('id', item.id)
            .single();

          if (!error && data) {
            setPostSettings({
              hideLikes: data.hide_likes,
              hideShares: data.hide_shares,
              hideComments: data.hide_comments,
            });
          }
        }
      };

      fetchPostSettings();

      const settingsSubscription = supabase
        .channel('posts-settings')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `id=eq.${item.id}`,
          },
          (payload) => {
            setPostSettings({
              hideLikes: payload.new.hide_likes,
              hideShares: payload.new.hide_shares,
              hideComments: payload.new.hide_comments,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(settingsSubscription);
      };
    }, [item.id]);

    return (
      <View style={styles.itemContainer}>
        {/* Render media content */}
        {/* {item.type === "video" ? (
          <VideoPost uri={item.uri} isVisible={isVisible} />
        ) : item.type === "image" && item.images ? (
          <View style={styles.imageCarouselContainer}>
            <View style={styles.carouselOverlay} pointerEvents="none" />
            <ImageCarousel item={item} />
            <View
              style={[styles.carouselOverlay, styles.rightOverlay]}
              pointerEvents="none"
            />
          </View>
        ) : (
          <Image
            source={{ uri: item.uri }}
            style={styles.media}
            contentFit="cover"
          />
        )} */}

        <PostUserInfo
          username={item?.user?.username ?? 'Anonymous'}
          profilePhoto={
            item?.user?.profilePhoto ?? 'https://placeholder.com/user'
          }
          comments={`${item?.comments?.length ?? 0} comments`}
          hashtags={item?.hashtags?.join(' ') ?? ''}
          postId={item.id}
          userId={item.user?.id}
          music={item.music ?? ''}
          createdAt={item.createdAt ?? new Date().toISOString()}
          isOwnProfile={isOwnProfile}
        />

        <PostActions
          isShareModalVisible={isShareModalVisible}
          isCommentModalVisible={isCommentModalVisible}
          onOpenShareModal={() => setIsShareModalVisible(true)}
          onCloseShareModal={() => setIsShareModalVisible(false)}
          onOpenCommentModal={() => setIsCommentModalVisible(true)}
          onCloseCommentModal={() => setIsCommentModalVisible(false)}
          likes={postSettings.hideLikes ? null : likesCount}
          isLiked={isLiked}
          onLike={handleLike}
          postId={item.id}
          hideShares={postSettings.hideShares}
          hideComments={postSettings.hideComments}
          hideLikes={postSettings.hideLikes}
          commentCount={commentCount}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  itemContainer: {
    height,
    width,
    flex: 1,
  },
  media: {
    height,
    width,
  },
  overlay: {
    position: 'absolute',
    bottom: 30,
    left: 20,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  playIcon: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageCarouselContainer: {
    flex: 1,
    position: 'relative',
  },
  carouselOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '30%',
    height: '100%',
    zIndex: 1,
  },
  rightOverlay: {
    left: undefined,
    right: 0,
  },
  pagerView: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
});

Post.displayName = 'Post';

export default Post;
