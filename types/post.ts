export type UserForPost = {
  id: string;
  username: string;
  profilePhoto: string;
};

export type FeedItem = {
  id: string;
  type: "video" | "image";
  uri: string;
  user?: UserForPost;
  images?: string[];
  createdAt?: string;
  music?: string;
  comments?: string[];
  hashtags?: string[];
};

export interface PostUserInfoProps {
  username: string;
  profilePhoto: string;
  comments: string;
  hashtags: string;
  postId: string;
  music?: string;
  createdAt: string;
  userId?: string;
  onPress?: (() => void) | null;
  isOwnProfile?: boolean;
}

export interface ProfileData {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  website_url: string;
  location_enabled: boolean;
  followers_count: number;
  following_count: number;
}

// types/post.ts
export interface Post {
  id: string;
  user_id: string;
  profile_id: string;
  media_type: string;
  main_media_url: string;
  additional_media: string[];
  comment?: string;
  music?: string;
  mentions: string[];
  hashtags: string[];
  hide_likes: boolean;
  hide_comments: boolean;
  hide_shares: boolean;
  is_locked: boolean;
  filter_applied?: string;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

export interface GridPost {
  id: string;
  uri: string;
  type: string;
  images?: string[];
  user?: {
    id: string;
    username: string;
    profilePhoto: string;
  };
  createdAt: string;
  music?: string;
  hashtags?: string[];
}
