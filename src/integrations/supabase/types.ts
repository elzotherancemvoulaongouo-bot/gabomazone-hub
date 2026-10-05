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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      algorithm_settings: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: []
      }
      banned_words: {
        Row: {
          created_at: string
          id: string
          severity: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          severity?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          severity?: string
          word?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          moderation_status: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          moderation_status?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          moderation_status?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invites: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          invitee_id: string
          inviter_id: string
          page_id: string | null
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          invitee_id: string
          inviter_id: string
          page_id?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          invitee_id?: string
          inviter_id?: string
          page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          page_id: string | null
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          page_id?: string | null
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          page_id?: string | null
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_user_flags: {
        Row: {
          created_at: string
          flag: string
          group_id: string | null
          id: string
          page_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          flag: string
          group_id?: string | null
          id?: string
          page_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          flag?: string
          group_id?: string | null
          id?: string
          page_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_user_flags_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_user_flags_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          organizer_id: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          organizer_id: string
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          organizer_id?: string
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_private: boolean
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_private?: boolean
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      hidden_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_path: string | null
          content: string | null
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          kind: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          audio_path?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          audio_path?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string
          note: string | null
          report_id: string | null
          target_id: string
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id: string
          note?: string | null
          report_id?: string | null
          target_id: string
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string
          note?: string | null
          report_id?: string | null
          target_id?: string
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_auto_log: {
        Row: {
          appeal_text: string | null
          created_at: string
          decision: string
          excerpt: string | null
          id: string
          reasons: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          score: number
          status: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          appeal_text?: string | null
          created_at?: string
          decision: string
          excerpt?: string | null
          id?: string
          reasons?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          score: number
          status?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          appeal_text?: string | null
          created_at?: string
          decision?: string
          excerpt?: string | null
          id?: string
          reasons?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          score?: number
          status?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          group_id: string | null
          id: string
          page_id: string | null
          post_id: string | null
          preview: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          page_id?: string | null
          post_id?: string | null
          preview?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          page_id?: string | null
          post_id?: string | null
          preview?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_profile_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      page_admins: {
        Row: {
          created_at: string
          page_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          page_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_admins_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_followers: {
        Row: {
          created_at: string
          page_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          page_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_followers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          action_buttons: Json
          avatar_url: string | null
          category: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          phone: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          action_buttons?: Json
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          phone?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          action_buttons?: Json
          avatar_url?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          phone?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          path: string
          position: number
          post_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          path: string
          position?: number
          post_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          path?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          post_id: string
          reason: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          post_id: string
          reason: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          as_community: boolean
          caption: string | null
          created_at: string
          group_id: string | null
          id: string
          location: string | null
          media_type: string | null
          media_url: string | null
          moderation_status: string
          page_id: string | null
          user_id: string
          visibility: string
        }
        Insert: {
          as_community?: boolean
          caption?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          moderation_status?: string
          page_id?: string | null
          user_id: string
          visibility?: string
        }
        Update: {
          as_community?: boolean
          caption?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          moderation_status?: string
          page_id?: string | null
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          city: string | null
          contact_email: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          contact_email?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          background: string | null
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_path: string | null
          media_type: string | null
          user_id: string
        }
        Insert: {
          background?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_path?: string | null
          media_type?: string | null
          user_id: string
        }
        Update: {
          background?: string | null
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_path?: string | null
          media_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_id: string
          reporter_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          autoplay_videos: boolean
          created_at: string
          data_saver: boolean
          feed_algorithm: string
          feed_sort: string
          font_size: string
          friend_list_visibility: string
          high_contrast: boolean
          language: string
          muted_keywords: string[]
          notif_comments: boolean
          notif_email: boolean
          notif_friends: boolean
          notif_groups: boolean
          notif_likes: boolean
          notif_mentions: boolean
          notif_messages: boolean
          notif_push: boolean
          post_visibility: string
          reduce_motion: boolean
          theme: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
          who_can_comment: string
          who_can_friend_request: string
          who_can_message: string
        }
        Insert: {
          autoplay_videos?: boolean
          created_at?: string
          data_saver?: boolean
          feed_algorithm?: string
          feed_sort?: string
          font_size?: string
          friend_list_visibility?: string
          high_contrast?: boolean
          language?: string
          muted_keywords?: string[]
          notif_comments?: boolean
          notif_email?: boolean
          notif_friends?: boolean
          notif_groups?: boolean
          notif_likes?: boolean
          notif_mentions?: boolean
          notif_messages?: boolean
          notif_push?: boolean
          post_visibility?: string
          reduce_motion?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
          who_can_comment?: string
          who_can_friend_request?: string
          who_can_message?: string
        }
        Update: {
          autoplay_videos?: boolean
          created_at?: string
          data_saver?: boolean
          feed_algorithm?: string
          feed_sort?: string
          font_size?: string
          friend_list_visibility?: string
          high_contrast?: boolean
          language?: string
          muted_keywords?: string[]
          notif_comments?: boolean
          notif_email?: boolean
          notif_friends?: boolean
          notif_groups?: boolean
          notif_likes?: boolean
          notif_mentions?: boolean
          notif_messages?: boolean
          notif_push?: boolean
          post_visibility?: string
          reduce_motion?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
          who_can_comment?: string
          who_can_friend_request?: string
          who_can_message?: string
        }
        Relationships: []
      }
      user_suspensions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reason: string | null
          until: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          until: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string | null
          until?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_friend_of_me: { Args: { _other: string }; Returns: boolean }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_public: { Args: { _group_id: string }; Returns: boolean }
      is_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_page_admin: {
        Args: { _page_id: string; _user_id: string }
        Returns: boolean
      }
      is_suspended: { Args: { _user_id: string }; Returns: boolean }
      moderate_report: {
        Args: {
          _action: string
          _days?: number
          _note?: string
          _report_id: string
        }
        Returns: undefined
      }
      moderation_appeal: {
        Args: { _log_id: string; _text: string }
        Returns: undefined
      }
      moderation_normalize: { Args: { _t: string }; Returns: string }
      moderation_review: {
        Args: { _action: string; _log_id: string }
        Returns: undefined
      }
      moderation_risk: {
        Args: { _id: string; _table: string; _text: string; _user: string }
        Returns: {
          reasons: string[]
          score: number
        }[]
      }
      score_posts: {
        Args: { _ids: string[] }
        Returns: {
          post_id: string
          reason: string
          score: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
