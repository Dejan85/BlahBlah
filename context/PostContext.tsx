export interface Profile {
  id: string;
  updated_at: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  expo_push_token: string;
  birthday: string;
  onboarding_completed: boolean;
  website_url: string;
  latitude: number;
  longitude: number;
  location_enabled: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  profile_id: string;
  media_type: "image" | "video";
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
  profile?: Profile;
}

// context/PostContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/utils/supabase";

interface PostContextType {
  isUploading: boolean;
  uploadProgress: number;
  createPost: (
    postData: CreatePostData,
  ) => Promise<{ success: boolean; error?: string; post?: Post }>;
  uploadMedia: (uri: string, type: "image" | "video") => Promise<string>;
  getUserPosts: (userId: string) => Promise<Post[]>;
  getProfilePosts: (profileId: string) => Promise<Post[]>;
  deletePost: (postId: string) => Promise<{ success: boolean; error?: string }>;
}

export interface CreatePostData {
  mediaType: "image" | "video";
  mainMediaUri: string;
  additionalMedia?: { uri: string; type: "image" | "video" }[];
  comment?: string;
  music?: string;
  mentions?: string[];
  hashtags?: string[];
  hideLikes?: boolean;
  hideComments?: boolean;
  hideShares?: boolean;
  isLocked?: boolean;
  filterApplied?: string;
}

export const PostContext = createContext<PostContextType>({
  isUploading: false,
  uploadProgress: 0,
  createPost: async () => ({ success: false }),
  uploadMedia: async () => "",
  getUserPosts: async () => [],
  getProfilePosts: async () => [],
  deletePost: async () => ({ success: false }),
});

export const usePost = () => useContext(PostContext);

export const PostProvider = ({ children }: { children: ReactNode }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMedia = async (
    uri: string,
    type: "image" | "video",
  ): Promise<string> => {
    try {
      // Generate a unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const fileExt =
        uri.split(".").pop() || (type === "image" ? "jpg" : "mp4");
      const filePath = `${type}s/${fileName}.${fileExt}`;

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error("File does not exist");
      }

      // Read the file
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, blob, {
            contentType: type === "image" ? "image/jpeg" : "video/mp4",
            cacheControl: "86400",
            upsert: true,
          });

        if (uploadError) throw uploadError;
      } else {
        // For mobile platforms, use FormData
        const formData = new FormData();
        formData.append("file", {
          uri: uri,
          name: `${fileName}.${fileExt}`,
          type: type === "image" ? "image/jpeg" : "video/mp4",
        } as any);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, formData, {
            contentType: type === "image" ? "image/jpeg" : "video/mp4",
            cacheControl: "86400",
            upsert: true,
          });

        if (uploadError) throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("posts")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error;
    }
  };

  const createPost = async (postData: CreatePostData) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload main media
      console.log("Uploading main media:", postData.mainMediaUri);
      const mainMediaUrl = await uploadMedia(
        postData.mainMediaUri,
        postData.mediaType,
      );
      setUploadProgress(50);

      // Upload additional media if any
      let additionalMediaUrls: string[] = [];
      if (postData.additionalMedia && postData.additionalMedia.length > 0) {
        const uploadPromises = postData.additionalMedia.map((media) =>
          uploadMedia(media.uri, media.type),
        );
        additionalMediaUrls = await Promise.all(uploadPromises);
      }
      setUploadProgress(75);

      // Create post record
      const { data, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          media_type: postData.mediaType,
          main_media_url: mainMediaUrl,
          additional_media: additionalMediaUrls,
          comment: postData.comment,
          music: postData.music,
          mentions: postData.mentions || [],
          hashtags: postData.hashtags || [],
          hide_likes: postData.hideLikes || false,
          hide_comments: postData.hideComments || false,
          hide_shares: postData.hideShares || false,
          is_locked: postData.isLocked || false,
          filter_applied: postData.filterApplied,
        })
        .select("*, profile:profiles(*)")
        .single();

      setUploadProgress(100);

      if (error) throw error;

      return { success: true, post: data };
    } catch (error) {
      console.error("Error creating post:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getUserPosts = async (userId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profile:profiles(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const getProfilePosts = async (profileId: string): Promise<Post[]> => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profile:profiles(*)")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  };

  return (
    <PostContext.Provider
      value={{
        isUploading,
        uploadProgress,
        createPost,
        uploadMedia,
        getUserPosts,
        getProfilePosts,
        deletePost,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};
