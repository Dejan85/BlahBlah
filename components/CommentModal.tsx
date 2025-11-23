import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import BottomModal from "./BottomModal";
import { Like, Send, SendChat, Star } from "@/assets/images";
import { FlashList } from "@shopify/flash-list";
import CustomTextInput from "./CustomTextInput";
import BottomSheet from "./BS";
import { supabase } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import Avatar from "./Avatar";
import { Ionicons } from "@expo/vector-icons";
interface CommentUser {
  username: string;
  avatar_url: string;
}

interface BaseComment {
  id: string;
  profile_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  profile: CommentUser;
  is_liked: boolean;
  username?: string;
}

interface Comment extends BaseComment {
  replies: Reply[];
  showReplies: boolean;
}

interface Reply extends BaseComment {
  reply_to_profile_id?: string;
  reply_to_profile?: {
    username: string;
  };
}

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
}

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
}

interface ReplyingTo {
  commentId: string;
  username: string;
  replyId?: string;
  profile_id: string; // Make profile_id required
}

const INITIAL_VISIBLE_COMMENTS = 5;

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  onClose,
  postId,
}) => {
  const [newComment, setNewComment] = useState("");

  const flashListRef = useRef<FlashList<Comment>>(null);
  const { user } = useAuth();
  const [showAllComments, setShowAllComments] = useState(false);
  const [currentSnap, setCurrentSnap] = useState<"closed" | "partial" | "full">(
    "partial",
  );
  const [isLoading, setIsLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<ReplyingTo | null>(null);

  const handleSnapChange = (snap: "closed" | "partial" | "full") => {
    setCurrentSnap(snap);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const toggleReplies = useCallback((commentId: string) => {
    setComments((prevComments) =>
      prevComments.map((comment) =>
        comment.id === commentId
          ? { ...comment, showReplies: !comment.showReplies }
          : comment,
      ),
    );
  }, []);

  const fetchComments = useCallback(async () => {
    if (!postId) {
      console.error("No postId provided to CommentModal");
      return;
    }

    try {
      setIsLoading(true);
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          *,
          profile:profiles(username, avatar_url),
          replies:comment_replies(
            *,
            profile:profiles!comment_replies_profile_id_fkey(username, avatar_url),
            reply_to_profile:profiles!comment_replies_reply_to_profile_id_fkey(username)
          )
        `,
        )
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;

      let likedCommentIds = new Set<string>();

      // Only fetch likes if user is authenticated
      if (user?.id) {
        const { data: userLikes, error: likesError } = await supabase
          .from("comment_likes")
          .select("comment_id")
          .eq("profile_id", user.id);

        if (!likesError && userLikes) {
          likedCommentIds = new Set(userLikes.map((like) => like.comment_id));
        }
      }

      // Transform and set comments
      const transformedComments = (commentsData || []).map((comment: any) => ({
        ...comment,
        is_liked: likedCommentIds.has(comment.id),
        showReplies: false,
        replies: (comment.replies || []).map((reply: any) => ({
          ...reply,
          is_liked: false,
        })),
      })) as Comment[];

      setComments(transformedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    if (visible) {
      fetchComments();
    }
  }, [visible, fetchComments]);

  // Handle comment creation

  const handleSendComment = async () => {
    if (!newComment.trim() || !user?.id || !postId) return;

    try {
      if (replyingTo) {
        // Find the comment being replied to
        const commentToReplyTo = comments.find(
          (c) => c.id === replyingTo.commentId,
        );

        if (!commentToReplyTo) {
          throw new Error("Comment not found");
        }

        // Determine the profile_id to reply to
        const replyToProfileId = replyingTo.replyId
          ? replyingTo.profile_id // If replying to a reply, use that reply's profile_id
          : commentToReplyTo.profile_id; // If replying to a comment, use the comment's profile_id

        // Create reply
        const { data, error } = await supabase
          .from("comment_replies")
          .insert({
            comment_id: replyingTo.commentId,
            profile_id: user.id,
            reply_to_profile_id: replyToProfileId,
            content: newComment.trim(),
          })
          .select(
            `
            *,
            profile:profiles!comment_replies_profile_id_fkey(username, avatar_url),
            reply_to_profile:profiles!comment_replies_reply_to_profile_id_fkey(username)
          `,
          )
          .single();

        if (error) throw error;

        // Update local state
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === replyingTo.commentId
              ? {
                  ...comment,
                  replies: [
                    ...(comment.replies || []),
                    {
                      ...data,
                      is_liked: false,
                    },
                  ],
                  showReplies: true,
                }
              : comment,
          ),
        );
      } else {
        // Create new comment logic remains the same
        const { data, error } = await supabase
          .from("comments")
          .insert({
            post_id: postId,
            profile_id: user.id,
            content: newComment.trim(),
          })
          .select(
            `
            *,
            profile:profiles(username, avatar_url)
          `,
          )
          .single();

        if (error) throw error;

        setComments((prevComments) => [
          {
            ...data,
            replies: [],
            showReplies: false,
            is_liked: false,
          },
          ...prevComments,
        ]);
      }

      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error sending comment:", error);
      // You might want to show an error message to the user here
    }
  };

  // Handle like/unlike
  const handleLike = async (commentId: string, replyId?: string) => {
    if (!user?.id) return;

    try {
      if (replyId) {
        // Handle reply like
        const { data: existingLike } = await supabase
          .from("reply_likes")
          .select()
          .eq("reply_id", replyId)
          .eq("profile_id", user.id)
          .single();

        if (existingLike) {
          await supabase
            .from("reply_likes")
            .delete()
            .eq("reply_id", replyId)
            .eq("profile_id", user.id);
        } else {
          await supabase.from("reply_likes").insert({
            reply_id: replyId,
            profile_id: user.id,
          });
        }

        // Update local state
        setComments((prevComments) =>
          prevComments.map((comment) => ({
            ...comment,
            replies: comment.replies?.map((reply) =>
              reply.id === replyId
                ? {
                    ...reply,
                    likes_count: existingLike
                      ? reply.likes_count - 1
                      : reply.likes_count + 1,
                    is_liked: !reply.is_liked,
                  }
                : reply,
            ),
          })),
        );
      } else {
        // Handle comment like
        const { data: existingLike } = await supabase
          .from("comment_likes")
          .select()
          .eq("comment_id", commentId)
          .eq("profile_id", user.id)
          .single();

        if (existingLike) {
          await supabase
            .from("comment_likes")
            .delete()
            .eq("comment_id", commentId)
            .eq("profile_id", user.id);
        } else {
          await supabase.from("comment_likes").insert({
            comment_id: commentId,
            profile_id: user.id,
          });
        }

        // Update local state
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  likes_count: existingLike
                    ? comment.likes_count - 1
                    : comment.likes_count + 1,
                  is_liked: !comment.is_liked,
                }
              : comment,
          ),
        );
      }
    } catch (error) {
      console.error("Error handling like:", error);
    }
  };

  // Update the renderReply function to include spacing
  const renderReply = ({
    item,
    commentId,
  }: {
    item: Reply;
    commentId: string;
  }) => {
    const replyDate = new Date(item.created_at);
    const timeAgo = formatTimeAgo(replyDate);

    return (
      <View style={styles.replyMainContainer}>
        <View style={styles.replyContainer}>
          <TouchableOpacity style={styles.profileContainer}>
            <Avatar
              url={item?.profile?.avatar_url}
              size={45}
              style={styles.commentAvatar}
            />
          </TouchableOpacity>

          <View style={styles.replyContent}>
            <View style={styles.replyHeader}>
              <Text style={styles.username}>{item.profile.username}</Text>
              {item.reply_to_profile && (
                <Text style={styles.replyingToIndicator}>
                  replying to{" "}
                  <Text style={styles.replyToUsername}>
                    {item.reply_to_profile.username}
                  </Text>
                </Text>
              )}
            </View>
            <Text style={styles.contentText}>{item.content}</Text>
            <View style={styles.commentFooter}>
              <Text style={styles.timeAgo}>{timeAgo}</Text>
              {item.likes_count >= 1 ? (
                <View style={styles.topCommentContainer}>
                  <Text style={styles.likesCount}>
                    {item.likes_count} likes
                  </Text>
                  <Ionicons
                    name="star"
                    size={8}
                    color="#fff"
                    style={styles.starIcon}
                  />
                </View>
              ) : (
                <Text style={[styles.likesCount, { paddingLeft: 5 }]}>
                  {item.likes_count} likes
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  setReplyingTo({
                    commentId,
                    username: item.profile.username,
                    replyId: item.id,
                    profile_id: item.profile_id,
                  });
                }}
              >
                <Text style={styles.replyButton}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => handleLike(commentId, item.id)}
            style={styles.likeContainer}
          >
            <Like fill={item.is_liked ? "#FF325E" : "#fff"} />
          </TouchableOpacity>
        </View>

        {/* Add spacing when replying to this specific reply */}
        {replyingTo?.replyId === item.id && (
          <View style={styles.replyingSpace} />
        )}
      </View>
    );
  };

  const renderComment = ({ item }: { item: Comment }) => {
    return (
      <View
        style={[
          styles.commentContainer,
          // Add extra margin when replying to this comment
          replyingTo?.commentId === item.id &&
            !replyingTo?.replyId &&
            styles.commentWithReplySpace,
        ]}
      >
        <View style={styles.commentRow}>
          <TouchableOpacity style={styles.profileContainer}>
            <Avatar
              url={item?.profile?.avatar_url}
              size={45}
              style={styles.commentAvatar}
            />
          </TouchableOpacity>

          <View style={styles.commentContent}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{item.profile.username}</Text>
            </View>
            <Text style={styles.contentText}>{item.content}</Text>
            <View style={styles.commentFooter}>
              <Text style={styles.timeAgo}>
                {formatTimeAgo(new Date(item.created_at))}
              </Text>

              {item.likes_count >= 1 ? (
                <View style={styles.topCommentContainer}>
                  <Text style={styles.likesCount}>
                    {item.likes_count} likes
                  </Text>
                  <Ionicons
                    name="star"
                    size={8}
                    color="#fff"
                    style={styles.starIcon}
                  />
                </View>
              ) : (
                <View>
                  <Text style={[styles.likesCount, { paddingLeft: 5 }]}>
                    {item.likes_count} likes
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() =>
                  setReplyingTo({
                    commentId: item.id,
                    username: item.profile.username,
                    profile_id: item.profile_id,
                  })
                }
              >
                <Text style={styles.replyButton}>Reply</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => handleLike(item.id)}
            style={styles.likeContainer}
          >
            <Like fill={item.is_liked ? "#FF325E" : "#fff"} />
          </TouchableOpacity>
        </View>

        {item.replies.length > 0 && (
          <TouchableOpacity
            style={styles.showRepliesButton}
            onPress={() => toggleReplies(item.id)}
          >
            <Text style={styles.showRepliesText}>
              {item.showReplies
                ? "Hide replies"
                : `Show replies (${item.replies.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {item.showReplies &&
          item.replies.map((reply) => (
            <View key={reply.id}>
              {renderReply({ item: reply, commentId: item.id })}
            </View>
          ))}
      </View>
    );
  };

  const sortedComments = [...comments]
    .sort((a, b) => b.likes_count - a.likes_count)
    .slice(0, showAllComments ? undefined : INITIAL_VISIBLE_COMMENTS);

  const renderBottomChildren = (
    <CustomTextInput
      value={newComment}
      onChangeText={setNewComment}
      placeholder={"Type..."}
      placeholderTextColor="#919191"
      style={styles.input}
      styleContainer={styles.inputContainerStyle}
      onRightIconPress={handleSendComment}
      rightIcon={
        <TouchableOpacity onPress={handleSendComment}>
          <SendChat />
        </TouchableOpacity>
      }
      textStyle={styles.textInputTextStyle}
      blurOnSubmit={false}
      onSubmitEditing={handleSendComment}
      returnKeyType="send"
    />
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      initialSnap="partial"
      header={false}
      onSnapChange={handleSnapChange}
      modalStyle={styles.modalContainer}
      isOnBottom={true}
      bottomChildren={renderBottomChildren}
      bottomStyle={styles.sendRow}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.listContainer,
            currentSnap === "full" && styles.fullScreenList,
          ]}
        >
          <FlashList
            ref={flashListRef}
            data={sortedComments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            estimatedItemSize={100}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.listContentContainer}
            scrollEnabled={currentSnap === "full"}
          />

          {comments.length > INITIAL_VISIBLE_COMMENTS && !showAllComments && (
            <TouchableOpacity
              style={styles.showAllButton}
              onPress={() => setShowAllComments(true)}
            >
              <Text style={styles.showAllText}>Show all {comments.length}</Text>
            </TouchableOpacity>
          )}
        </View>

        {currentSnap === "full" && (
          <View style={styles.inputWrapper}>
            {(replyingTo || replyingTo) && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  Replying to{" "}
                  {replyingTo
                    ? replyingTo.username
                    : comments.find((c) => c.id === replyingTo)?.username}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                  }}
                >
                  <Text style={styles.cancelReplyText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  inputWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#007bff",
    paddingBottom: Platform.OS === "ios" ? 130 : 160,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  replyingSpace: {
    height: 60, // Adjust this value to control spacing
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
  },

  commentWithReplySpace: {
    marginBottom: 60, // Matching the replyingSpace height
  },
  commentAvatar: {
    marginRight: 5,
  },
  line: {
    backgroundColor: "#fff",
    width: 28,
    marginTop: 7,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sendRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 120,
    marginHorizontal: 20,
    marginTop: 10,
    top: 0,
  },
  topCommentContainer: {
    backgroundColor: "#FF325E",
    borderRadius: 20,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    flexDirection: "row",
    paddingVertical: 3,
    top: -2,
  },
  replyingToIndicator: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.7,
    fontFamily: "InterRegular",
  },
  replyToUsername: {
    fontFamily: "InterMedium",
  },
  commentRow: {
    flexDirection: "row",
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  profileContainer: {
    alignItems: "center",
    marginRight: 10,
  },
  fullScreenList: {
    marginBottom: 80, // Space for input
  },
  profilePhoto: {
    width: 55,
    height: 55,
    borderRadius: 30,
    marginRight: 5,
  },
  commentContent: {
    flex: 1,
    flexDirection: "column",
    paddingLeft: 10,
    paddingTop: 5,
  },
  username: {
    fontSize: 16,
    color: "#fff",
    fontFamily: "InterSemiBold",
  },
  listContainer: {
    flex: 1,
    marginBottom: 10,
    height: "100%", // Add this
  },

  modalContainer: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "#007bff",
    paddingBottom: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  contentText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "InterMedium",
    paddingVertical: 3,
  },
  commentFooter: {
    flexDirection: "row",
  },
  timeAgo: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "InterSemiBold",
  },
  listContentContainer: {
    paddingVertical: 10,
  },
  likesCount: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "InterSemiBold",
  },
  likeContainer: {
    justifyContent: "center",
    paddingLeft: 10,
  },

  inputContainerStyle: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 40,
    paddingRight: 10,
    justifyContent: "center",
    alignContent: "center",
    alignItems: "center",
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  textInputTextStyle: {
    fontSize: 14,
    color: "#919191",
    fontFamily: "InterMedium",
  },

  commentContainer: {
    marginVertical: 10,
  },

  replyProfilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  starIcon: {
    marginLeft: 3,
    top: 3,
  },

  replyButton: {
    fontSize: 10,
    color: "#fff",
    fontFamily: "InterRegular",
    paddingLeft: 10,
  },

  replyMainContainer: {
    marginBottom: 10,
  },

  replyContainer: {
    flexDirection: "row",
    paddingLeft: 77,
    paddingRight: 20,
    marginTop: 10,
  },

  replySpacing: {
    height: 40, // Adjust this value to match the spacing you want
  },
  replyContent: {
    flex: 1,
  },
  showRepliesButton: {
    paddingLeft: 85,
    paddingTop: 5,
  },
  showRepliesText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "InterMedium",
    opacity: 0.8,
  },
  showAllButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  showAllText: {
    fontSize: 14,
    color: "#fff",
    fontFamily: "InterMedium",
  },

  replyingToContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
  },
  replyingToText: {
    fontSize: 12,
    color: "#fff",
    fontFamily: "InterMedium",
  },
  cancelReplyText: {
    fontSize: 12,
    color: "#FF325E",
    fontFamily: "InterSemiBold",
  },
});

export default CommentModal;
