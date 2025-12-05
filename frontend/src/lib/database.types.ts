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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      chain_invites: {
        Row: {
          chain_id: string | null
          created_at: string | null
          id: string
          message: string | null
          request_id: string
          shareable_link: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chain_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          request_id: string
          shareable_link: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chain_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          request_id?: string
          shareable_link?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_invites_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_invites_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "orphaned_chains_view"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "chain_invites_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_invites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_likes: {
        Row: {
          chain_id: string
          created_at: string | null
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string | null
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chain_likes_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_likes_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "orphaned_chains_view"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "chain_likes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      chains: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          participants: Json
          request_id: string
          status: string
          total_reward: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          participants?: Json
          request_id: string
          status?: string
          total_reward: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          participants?: Json
          request_id?: string
          status?: string
          total_reward?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chains_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          expires_at: string | null
          id: string
          message: string | null
          reward: number
          shareable_link: string
          status: string
          target: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          reward: number
          shareable_link: string
          status?: string
          target: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          reward?: number
          shareable_link?: string
          status?: string
          target?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          chain_id: string | null
          created_at: string | null
          description: string
          id: string
          related_user_id: string | null
          request_id: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          chain_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          related_user_id?: string | null
          request_id?: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          chain_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          related_user_id?: string | null
          request_id?: string | null
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "orphaned_chains_view"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "credit_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_analytics: {
        Row: {
          analytics_date: string
          connections_made: number | null
          created_at: string | null
          email_clicks: number | null
          id: string
          linkedin_clicks: number | null
          profile_views: number | null
          shares_made: number | null
          shares_received: number | null
          total_clicks: number | null
          user_id: string
        }
        Insert: {
          analytics_date: string
          connections_made?: number | null
          created_at?: string | null
          email_clicks?: number | null
          id?: string
          linkedin_clicks?: number | null
          profile_views?: number | null
          shares_made?: number | null
          shares_received?: number | null
          total_clicks?: number | null
          user_id: string
        }
        Update: {
          analytics_date?: string
          connections_made?: number | null
          created_at?: string | null
          email_clicks?: number | null
          id?: string
          linkedin_clicks?: number | null
          profile_views?: number | null
          shares_made?: number | null
          shares_received?: number | null
          total_clicks?: number | null
          user_id?: string
        }
        Relationships: []
      }
      direct_connection_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_connection_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_connection_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          invite_link: string
          invitee_email: string
          invitee_id: string | null
          inviter_id: string
          message: string | null
          request_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_link?: string
          invitee_email: string
          invitee_id?: string | null
          inviter_id: string
          message?: string | null
          request_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_link?: string
          invitee_email?: string
          invitee_id?: string | null
          inviter_id?: string
          message?: string | null
          request_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_invitee_id_fkey"
            columns: ["invitee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          clicked_user_id: string | null
          country: string | null
          device_type: string | null
          id: string
          ip_address: unknown | null
          link_type: string
          link_url: string
          metadata: Json | null
          referrer: string | null
          session_id: string | null
          source_page: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          clicked_user_id?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          link_type: string
          link_url: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          source_page?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          clicked_user_id?: string | null
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          link_type?: string
          link_url?: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          source_page?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      link_shares: {
        Row: {
          clicks_from_share: number | null
          conversions_from_share: number | null
          id: string
          metadata: Json | null
          share_medium: string
          share_type: string
          share_url: string
          shared_at: string
          shared_user_id: string | null
          user_id: string
        }
        Insert: {
          clicks_from_share?: number | null
          conversions_from_share?: number | null
          id?: string
          metadata?: Json | null
          share_medium: string
          share_type: string
          share_url: string
          shared_at?: string
          shared_user_id?: string | null
          user_id: string
        }
        Update: {
          clicks_from_share?: number | null
          conversions_from_share?: number | null
          id?: string
          metadata?: Json | null
          share_medium?: string
          share_type?: string
          share_url?: string
          shared_at?: string
          shared_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string | null
          sender_id: string
          sent_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          sender_id: string
          sent_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string | null
          sender_id?: string
          sent_at?: string
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
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          amount: number
          chain_id: string
          created_at: string | null
          id: string
          paid_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          chain_id: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          chain_id?: string
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "orphaned_chains_view"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      target_claims: {
        Row: {
          chain_id: string
          claimant_id: string
          contact_info: string
          contact_preference: string
          created_at: string | null
          id: string
          message: string | null
          rejection_reason: string | null
          request_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_company: string
          target_email: string
          target_name: string
          target_role: string
          updated_at: string | null
        }
        Insert: {
          chain_id: string
          claimant_id?: string
          contact_info: string
          contact_preference: string
          created_at?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          request_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_company: string
          target_email: string
          target_name: string
          target_role: string
          updated_at?: string | null
        }
        Update: {
          chain_id?: string
          claimant_id?: string
          contact_info?: string
          contact_preference?: string
          created_at?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          request_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_company?: string
          target_email?: string
          target_name?: string
          target_role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "target_claims_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_claims_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "orphaned_chains_view"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "target_claims_claimant_id_fkey"
            columns: ["claimant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_claims_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "target_claims_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          reference_id: string | null
          status: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          reference_id?: string | null
          status?: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          status?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      unlocked_chains: {
        Row: {
          chain_id: string
          created_at: string | null
          credits_spent: number
          id: string
          request_id: string
          user_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string | null
          credits_spent: number
          id?: string
          request_id: string
          user_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string | null
          credits_spent?: number
          id?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlocked_chains_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unlocked_chains_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "orphaned_chains_view"
            referencedColumns: ["chain_id"]
          },
          {
            foreignKeyName: "unlocked_chains_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          avg_time_on_profile: number | null
          bounce_rate: number | null
          connection_requests_received: number | null
          connection_requests_sent: number | null
          connections_made: number | null
          created_at: string | null
          email_clicks: number | null
          id: string
          last_updated: string | null
          linkedin_clicks: number | null
          profile_views: number | null
          profile_views_this_month: number | null
          profile_views_this_week: number | null
          profile_views_today: number | null
          return_visitor_rate: number | null
          share_click_through_rate: number | null
          shares_generated: number | null
          times_shared: number | null
          total_link_clicks: number | null
          user_id: string
        }
        Insert: {
          avg_time_on_profile?: number | null
          bounce_rate?: number | null
          connection_requests_received?: number | null
          connection_requests_sent?: number | null
          connections_made?: number | null
          created_at?: string | null
          email_clicks?: number | null
          id?: string
          last_updated?: string | null
          linkedin_clicks?: number | null
          profile_views?: number | null
          profile_views_this_month?: number | null
          profile_views_this_week?: number | null
          profile_views_today?: number | null
          return_visitor_rate?: number | null
          share_click_through_rate?: number | null
          shares_generated?: number | null
          times_shared?: number | null
          total_link_clicks?: number | null
          user_id: string
        }
        Update: {
          avg_time_on_profile?: number | null
          bounce_rate?: number | null
          connection_requests_received?: number | null
          connection_requests_sent?: number | null
          connections_made?: number | null
          created_at?: string | null
          email_clicks?: number | null
          id?: string
          last_updated?: string | null
          linkedin_clicks?: number | null
          profile_views?: number | null
          profile_views_this_month?: number | null
          profile_views_this_week?: number | null
          profile_views_today?: number | null
          return_visitor_rate?: number | null
          share_click_through_rate?: number | null
          shares_generated?: number | null
          times_shared?: number | null
          total_link_clicks?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          connected_at: string
          connection_request_id: string | null
          connection_type: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          connected_at?: string
          connection_request_id?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          connected_at?: string
          connection_request_id?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_connections_connection_request_id_fkey"
            columns: ["connection_request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_connections_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string | null
          earned_credits: number
          id: string
          spent_credits: number
          total_credits: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          earned_credits?: number
          id?: string
          spent_credits?: number
          total_credits?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          earned_credits?: number
          id?: string
          spent_credits?: number
          total_credits?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          profile_picture_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          interests: string[] | null
          is_verified: boolean | null
          last_active: string | null
          last_name: string
          linkedin_url: string | null
          location: string | null
          role: string | null
          skills: string[] | null
          twitter_url: string | null
          updated_at: string | null
          visibility: string | null
          anonymous_name: string | null
        }
        Insert: {
          profile_picture_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          interests?: string[] | null
          is_verified?: boolean | null
          last_active?: string | null
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          role?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          updated_at?: string | null
          visibility?: string | null
          anonymous_name?: string | null
        }
        Update: {
          profile_picture_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          interests?: string[] | null
          is_verified?: boolean | null
          last_active?: string | null
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          role?: string | null
          skills?: string[] | null
          twitter_url?: string | null
          updated_at?: string | null
          visibility?: string | null
          anonymous_name?: string | null
        }
        Relationships: []
      }
      wallet: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string
          type: string
          updated_at: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type: string
          updated_at?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          type?: string
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      orphaned_chains_view: {
        Row: {
          chain_created_at: string | null
          chain_id: string | null
          chain_status: string | null
          creator_id: string | null
          deleted_at: string | null
          participants: Json | null
          request_id: string | null
          request_status: string | null
          target: string | null
          total_reward: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chains_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "connection_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_participant_to_chain: {
        Args: { chain_uuid: string; participant_data: Json }
        Returns: boolean
      }
      approve_target_claim: {
        Args: { claim_uuid: string }
        Returns: undefined
      }
      cleanup_orphaned_chains: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_chains: number
          cleaned_link_clicks: number
          cleaned_rewards: number
          cleaned_target_claims: number
        }[]
      }
      complete_chain_and_distribute_rewards: {
        Args: { chain_uuid: string }
        Returns: boolean
      }
      create_invite_notification: {
        Args: { invite_uuid: string }
        Returns: undefined
      }
      create_user_connection: {
        Args: { p_request_id: string; p_user_a: string; p_user_b: string }
        Returns: string
      }
      debug_auth: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      discover_users: {
        Args: {
          p_company?: string
          p_exclude_connected?: boolean
          p_limit?: number
          p_location?: string
          p_offset?: number
          p_search?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          company: string
          email: string
          first_name: string
          has_pending_request: boolean
          interests: string[]
          is_connected: boolean
          last_active: string
          last_name: string
          linkedin_url: string
          location: string
          mutual_connections: number
          role: string
          skills: string[]
          user_id: string
        }[]
      }
      enqueue_chain_tail_reminders: {
        Args: { cooldown_hours?: number; min_age_hours?: number }
        Returns: number
      }
      ensure_wallet: {
        Args: { p_user_id: string }
        Returns: string
      }
      expire_old_invites: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_unshared_chain_tails: {
        Args: { cooldown_hours?: number; min_age_hours?: number }
        Returns: {
          chain_id: string
          hours_since_joined: number
          joined_at: string
          request_id: string
          user_id: string
        }[]
      }
      get_conversation_messages: {
        Args: {
          p_before_message_id?: string
          p_conversation_id: string
          p_limit?: number
        }
        Returns: {
          content: string
          edited_at: string
          is_own_message: boolean
          message_id: string
          sender_avatar: string
          sender_id: string
          sender_name: string
          sent_at: string
        }[]
      }
      get_or_create_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      get_or_create_conversation_debug: {
        Args: { p_other_user_id: string }
        Returns: Json
      }
      get_user_analytics: {
        Args: { p_days_back?: number; p_user_id?: string }
        Returns: {
          connections_made: number
          daily_stats: Json
          email_clicks: number
          linkedin_clicks: number
          shares_generated: number
          times_shared: number
          total_link_clicks: number
          total_profile_views: number
        }[]
      }
      get_user_connections: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          connected_at: string
          connected_user_id: string
          connection_id: string
          connection_request_id: string
          connection_type: string
          email: string
          first_name: string
          last_name: string
          linkedin_url: string
        }[]
      }
      get_user_conversations: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          conversation_id: string
          last_message_content: string
          last_message_sender_id: string
          last_message_sent_at: string
          other_user_avatar: string
          other_user_id: string
          other_user_name: string
          unread_count: number
          updated_at: string
        }[]
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      reject_target_claim: {
        Args: { claim_uuid: string; reason?: string }
        Returns: undefined
      }
      respond_to_chain_invite: {
        Args: { p_invite_id: string; p_response: string }
        Returns: boolean
      }
      respond_to_direct_connection_request: {
        Args: { p_request_id: string; p_response: string }
        Returns: boolean
      }
      send_chain_invite: {
        Args: { p_message?: string; p_request_id: string; p_user_ids: string[] }
        Returns: number
      }
      send_direct_connection_request: {
        Args: { p_message?: string; p_receiver_id: string }
        Returns: string
      }
      send_message: {
        Args: { p_content: string; p_conversation_id: string }
        Returns: string
      }
      soft_delete_connection_request: {
        Args: { p_request_id: string }
        Returns: boolean
      }
      test_function: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      track_link_click: {
        Args: {
          p_clicked_user_id: string
          p_ip_address?: string
          p_link_type: string
          p_link_url: string
          p_metadata?: Json
          p_referrer?: string
          p_source_page?: string
          p_user_agent?: string
        }
        Returns: string
      }
      track_link_share: {
        Args: {
          p_metadata?: Json
          p_share_medium: string
          p_share_type: string
          p_share_url: string
          p_shared_user_id: string
        }
        Returns: string
      }
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
