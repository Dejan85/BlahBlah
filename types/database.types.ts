export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      blahs: {
        Row: {
          content: string
          created_at: string | null
          id: string
          recipient_count: number | null
          sender_id: string | null
          type: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          recipient_count?: number | null
          sender_id?: string | null
          type?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          recipient_count?: number | null
          sender_id?: string | null
          type?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          profile_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_replies: {
        Row: {
          comment_id: string | null
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          likes_count: number | null
          profile_id: string | null
          reply_to_profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          comment_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          profile_id?: string | null
          reply_to_profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comment_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          profile_id?: string | null
          reply_to_profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_replies_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_replies_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_replies_reply_to_profile_id_fkey"
            columns: ["reply_to_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          likes_count: number | null
          post_id: string | null
          profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          post_id?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          likes_count?: number | null
          post_id?: string | null
          profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_muted: boolean | null
          is_pinned: boolean | null
          participant1_id: string
          participant1_last_read_at: string | null
          participant2_id: string
          participant2_last_read_at: string | null
          saved: boolean
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          is_pinned?: boolean | null
          participant1_id: string
          participant1_last_read_at?: string | null
          participant2_id: string
          participant2_last_read_at?: string | null
          saved?: boolean
        }
        Update: {
          created_at?: string | null
          id?: string
          is_muted?: boolean | null
          is_pinned?: boolean | null
          participant1_id?: string
          participant1_last_read_at?: string | null
          participant2_id?: string
          participant2_last_read_at?: string | null
          saved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          created_at: string | null
          followed_id: string
          follower_id: string
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          followed_id: string
          follower_id: string
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          followed_id?: string
          follower_id?: string
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_requests_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_requests_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_recipient_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_requester_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          followed_id: string
          follower_id: string
          id: string
          receive_blahs: boolean | null
        }
        Insert: {
          created_at?: string | null
          followed_id: string
          follower_id: string
          id?: string
          receive_blahs?: boolean | null
        }
        Update: {
          created_at?: string | null
          followed_id?: string
          follower_id?: string
          id?: string
          receive_blahs?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          reaction_emoji: string
          reaction_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          reaction_emoji: string
          reaction_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          reaction_emoji?: string
          reaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          blah_id: string | null
          conversation_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          message_type: string | null
          opened_at: string | null
          reply_to: string | null
          sender_id: string
          text: string | null
        }
        Insert: {
          blah_id?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: string | null
          opened_at?: string | null
          reply_to?: string | null
          sender_id: string
          text?: string | null
        }
        Update: {
          blah_id?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: string | null
          opened_at?: string | null
          reply_to?: string | null
          sender_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_blah_id_fkey"
            columns: ["blah_id"]
            isOneToOne: false
            referencedRelation: "blahs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          payload: Json | null
          recipient_id: string
          sender_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payload?: Json | null
          recipient_id: string
          sender_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payload?: Json | null
          recipient_id?: string
          sender_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          additional_media: string[] | null
          comment: string | null
          created_at: string | null
          filter_applied: string | null
          hashtags: string[] | null
          hide_comments: boolean | null
          hide_likes: boolean | null
          hide_shares: boolean | null
          id: string
          is_locked: boolean | null
          main_media_url: string
          media_type: string
          mentions: string[] | null
          music: string | null
          profile_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_media?: string[] | null
          comment?: string | null
          created_at?: string | null
          filter_applied?: string | null
          hashtags?: string[] | null
          hide_comments?: boolean | null
          hide_likes?: boolean | null
          hide_shares?: boolean | null
          id?: string
          is_locked?: boolean | null
          main_media_url: string
          media_type: string
          mentions?: string[] | null
          music?: string | null
          profile_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_media?: string[] | null
          comment?: string | null
          created_at?: string | null
          filter_applied?: string | null
          hashtags?: string[] | null
          hide_comments?: boolean | null
          hide_likes?: boolean | null
          hide_shares?: boolean | null
          id?: string
          is_locked?: boolean | null
          main_media_url?: string
          media_type?: string
          mentions?: string[] | null
          music?: string | null
          profile_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          blah_score: number
          blahs_sent: number
          expo_push_token: string | null
          full_name: string | null
          id: string
          last_blah_at: string | null
          latitude: number | null
          location_enabled: boolean | null
          longitude: number | null
          onboarding_completed: boolean | null
          streak_day: number
          streak_tz_offset: number
          updated_at: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          blah_score?: number
          blahs_sent?: number
          expo_push_token?: string | null
          full_name?: string | null
          id: string
          last_blah_at?: string | null
          latitude?: number | null
          location_enabled?: boolean | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          streak_day?: number
          streak_tz_offset?: number
          updated_at?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          blah_score?: number
          blahs_sent?: number
          expo_push_token?: string | null
          full_name?: string | null
          id?: string
          last_blah_at?: string | null
          latitude?: number | null
          location_enabled?: boolean | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          streak_day?: number
          streak_tz_offset?: number
          updated_at?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      reply_likes: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string | null
          reply_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          reply_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          reply_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reply_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reply_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "comment_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_status: {
        Row: {
          conversation_id: string
          last_typed: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_typed?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_typed?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversation"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          created_at: string | null
          last_seen: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          last_seen?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          last_seen?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_expired_messages: { Args: never; Returns: number }
      delete_user_data: { Args: { user_id: string }; Returns: undefined }
      get_nearby_users: {
        Args: { radius_km: number; user_id: string }
        Returns: {
          distance: number
          id: string
        }[]
      }
      get_post_likes_count: { Args: { post_id: string }; Returns: number }
      has_user_liked_post: {
        Args: { post_id: string; user_id: string }
        Returns: boolean
      }
      is_blah_recipient: { Args: { blah_id: string }; Returns: boolean }
      is_blocked: {
        Args: { blocked: string; blocker: string }
        Returns: boolean
      }
      reset_lapsed_streaks: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
