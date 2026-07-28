export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          invited_username: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["household_member_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at: string
          household_id: string
          id?: string
          invited_by: string
          invited_username: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["household_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          invited_username?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["household_member_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      household_memberships: {
        Row: {
          created_at: string
          household_id: string
          id: string
          invited_by: string | null
          joined_at: string
          removed_at: string | null
          role: Database["public"]["Enums"]["household_member_role"]
          status: Database["public"]["Enums"]["household_membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          removed_at?: string | null
          role: Database["public"]["Enums"]["household_member_role"]
          status?: Database["public"]["Enums"]["household_membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["household_member_role"]
          status?: Database["public"]["Enums"]["household_membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_memberships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "household_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          name: string
          timezone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          idempotency_key: string
          last_error: string | null
          not_before: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          occurrence_id: string | null
          payload: Json
          recipient_user_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_outbox_status"]
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          not_before?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          occurrence_id?: string | null
          payload?: Json
          recipient_user_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_outbox_status"]
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          not_before?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          occurrence_id?: string | null
          payload?: Json
          recipient_user_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_outbox_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "task_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          due_soon_minutes: number
          notify_assigned: boolean
          notify_completed: boolean
          notify_due_soon: boolean
          notify_membership_changes: boolean
          notify_new_task: boolean
          notify_overdue: boolean
          notify_skipped: boolean
          notify_snoozed: boolean
          show_task_details: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_soon_minutes?: number
          notify_assigned?: boolean
          notify_completed?: boolean
          notify_due_soon?: boolean
          notify_membership_changes?: boolean
          notify_new_task?: boolean
          notify_overdue?: boolean
          notify_skipped?: boolean
          notify_snoozed?: boolean
          show_task_details?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          due_soon_minutes?: number
          notify_assigned?: boolean
          notify_completed?: boolean
          notify_due_soon?: boolean
          notify_membership_changes?: boolean
          notify_new_task?: boolean
          notify_overdue?: boolean
          notify_skipped?: boolean
          notify_snoozed?: boolean
          show_task_details?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_access: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          reason: string | null
          requested_at: string
          status: Database["public"]["Enums"]["platform_access_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["platform_access_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          reason?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["platform_access_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_access_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          next_status: Database["public"]["Enums"]["platform_access_status"]
          previous_status:
            | Database["public"]["Enums"]["platform_access_status"]
            | null
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          next_status: Database["public"]["Enums"]["platform_access_status"]
          previous_status?:
            | Database["public"]["Enums"]["platform_access_status"]
            | null
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          next_status?: Database["public"]["Enums"]["platform_access_status"]
          previous_status?:
            | Database["public"]["Enums"]["platform_access_status"]
            | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_access_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_administrators: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_administrators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          detected_timezone: string | null
          display_name: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          detected_timezone?: string | null
          display_name: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          detected_timezone?: string | null
          display_name?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_label: string | null
          disabled_at: string | null
          enabled: boolean
          endpoint: string
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_label?: string | null
          disabled_at?: string | null
          enabled?: boolean
          endpoint: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_label?: string | null
          disabled_at?: string | null
          enabled?: boolean
          endpoint?: string
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_payload: Json
          event_type: Database["public"]["Enums"]["task_event_type"]
          household_id: string
          id: string
          occurrence_id: string | null
          series_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type: Database["public"]["Enums"]["task_event_type"]
          household_id: string
          id?: string
          occurrence_id?: string | null
          series_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_payload?: Json
          event_type?: Database["public"]["Enums"]["task_event_type"]
          household_id?: string
          id?: string
          occurrence_id?: string | null
          series_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_events_occurrence_series_household_fkey"
            columns: ["occurrence_id", "series_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_occurrences"
            referencedColumns: ["id", "series_id", "household_id"]
          },
          {
            foreignKeyName: "task_events_series_household_fkey"
            columns: ["series_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_series"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      task_occurrences: {
        Row: {
          assignee_user_id: string | null
          assignment_locked: boolean
          assignment_source: Database["public"]["Enums"]["task_assignment_source"]
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_all_day: boolean
          lifecycle_state: Database["public"]["Enums"]["task_lifecycle_state"]
          occurrence_key: string
          original_due_end: string
          original_due_start: string
          rotation_override: boolean
          series_id: string
          skip_reason: string | null
          skipped_at: string | null
          skipped_by: string | null
          snoozed_by: string | null
          snoozed_until: string | null
          updated_at: string
          version: number
        }
        Insert: {
          assignee_user_id?: string | null
          assignment_locked?: boolean
          assignment_source?: Database["public"]["Enums"]["task_assignment_source"]
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          is_all_day?: boolean
          lifecycle_state?: Database["public"]["Enums"]["task_lifecycle_state"]
          occurrence_key: string
          original_due_end: string
          original_due_start: string
          rotation_override?: boolean
          series_id: string
          skip_reason?: string | null
          skipped_at?: string | null
          skipped_by?: string | null
          snoozed_by?: string | null
          snoozed_until?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          assignee_user_id?: string | null
          assignment_locked?: boolean
          assignment_source?: Database["public"]["Enums"]["task_assignment_source"]
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          is_all_day?: boolean
          lifecycle_state?: Database["public"]["Enums"]["task_lifecycle_state"]
          occurrence_key?: string
          original_due_end?: string
          original_due_start?: string
          rotation_override?: boolean
          series_id?: string
          skip_reason?: string | null
          skipped_at?: string | null
          skipped_by?: string | null
          snoozed_by?: string | null
          snoozed_until?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_occurrences_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_occurrences_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_occurrences_series_household_fkey"
            columns: ["series_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_series"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "task_occurrences_skipped_by_fkey"
            columns: ["skipped_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_occurrences_snoozed_by_fkey"
            columns: ["snoozed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_rotation_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rotation_position: number
          series_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rotation_position: number
          series_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rotation_position?: number
          series_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_rotation_members_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "task_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_rotation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_schedule_slots: {
        Row: {
          created_at: string
          end_day_offset: number
          id: string
          is_all_day: boolean
          local_end_time: string | null
          local_start_time: string | null
          series_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          end_day_offset?: number
          id?: string
          is_all_day?: boolean
          local_end_time?: string | null
          local_start_time?: string | null
          series_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          end_day_offset?: number
          id?: string
          is_all_day?: boolean
          local_end_time?: string | null
          local_start_time?: string | null
          series_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_schedule_slots_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "task_series"
            referencedColumns: ["id"]
          },
        ]
      }
      task_series: {
        Row: {
          assignment_mode: Database["public"]["Enums"]["task_assignment_mode"]
          category_id: string | null
          confirmation_required: boolean
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          effective_from: string
          end_after_occurrences: number | null
          end_at: string | null
          end_type: Database["public"]["Enums"]["task_end_type"]
          fixed_assignee_id: string | null
          household_id: string
          id: string
          missed_policy: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_config: Json
          recurrence_type: Database["public"]["Enums"]["task_recurrence_type"]
          rotation_cursor_updated_at: string | null
          rotation_cursor_user_id: string | null
          series_status: Database["public"]["Enums"]["task_series_status"]
          series_type: Database["public"]["Enums"]["task_series_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assignment_mode?: Database["public"]["Enums"]["task_assignment_mode"]
          category_id?: string | null
          confirmation_required?: boolean
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          effective_from: string
          end_after_occurrences?: number | null
          end_at?: string | null
          end_type?: Database["public"]["Enums"]["task_end_type"]
          fixed_assignee_id?: string | null
          household_id: string
          id?: string
          missed_policy?: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_config?: Json
          recurrence_type: Database["public"]["Enums"]["task_recurrence_type"]
          rotation_cursor_updated_at?: string | null
          rotation_cursor_user_id?: string | null
          series_status?: Database["public"]["Enums"]["task_series_status"]
          series_type: Database["public"]["Enums"]["task_series_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assignment_mode?: Database["public"]["Enums"]["task_assignment_mode"]
          category_id?: string | null
          confirmation_required?: boolean
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          effective_from?: string
          end_after_occurrences?: number | null
          end_at?: string | null
          end_type?: Database["public"]["Enums"]["task_end_type"]
          fixed_assignee_id?: string | null
          household_id?: string
          id?: string
          missed_policy?: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_config?: Json
          recurrence_type?: Database["public"]["Enums"]["task_recurrence_type"]
          rotation_cursor_updated_at?: string | null
          rotation_cursor_user_id?: string | null
          series_status?: Database["public"]["Enums"]["task_series_status"]
          series_type?: Database["public"]["Enums"]["task_series_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_series_category_household_fkey"
            columns: ["category_id", "household_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "task_series_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_series_fixed_assignee_id_fkey"
            columns: ["fixed_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_series_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_series_rotation_cursor_user_id_fkey"
            columns: ["rotation_cursor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_household_invitation: {
        Args: { input_token: string }
        Returns: string
      }
      apply_missed_policies: { Args: { input_now?: string }; Returns: number }
      assign_occurrence: {
        Args: {
          input_assignee_user_id: string
          input_expected_version: number
          input_lock?: boolean
          input_occurrence_id: string
        }
        Returns: {
          assignee_user_id: string | null
          assignment_locked: boolean
          assignment_source: Database["public"]["Enums"]["task_assignment_source"]
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_all_day: boolean
          lifecycle_state: Database["public"]["Enums"]["task_lifecycle_state"]
          occurrence_key: string
          original_due_end: string
          original_due_start: string
          rotation_override: boolean
          series_id: string
          skip_reason: string | null
          skipped_at: string | null
          skipped_by: string | null
          snoozed_by: string | null
          snoozed_until: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "task_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_occurrence: {
        Args: { input_expected_version: number; input_occurrence_id: string }
        Returns: {
          assignee_user_id: string | null
          assignment_locked: boolean
          assignment_source: Database["public"]["Enums"]["task_assignment_source"]
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_all_day: boolean
          lifecycle_state: Database["public"]["Enums"]["task_lifecycle_state"]
          occurrence_key: string
          original_due_end: string
          original_due_start: string
          rotation_override: boolean
          series_id: string
          skip_reason: string | null
          skipped_at: string | null
          skipped_by: string | null
          snoozed_by: string | null
          snoozed_until: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "task_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_category: {
        Args: {
          input_color?: string
          input_household_id: string
          input_name: string
        }
        Returns: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "categories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_household: {
        Args: { input_name: string; input_timezone: string }
        Returns: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "households"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_household_invitation: {
        Args: {
          input_expires_in_hours?: number
          input_household_id: string
          input_role: Database["public"]["Enums"]["household_member_role"]
          input_username: string
        }
        Returns: {
          expires_at: string
          invitation_id: string
          token: string
        }[]
      }
      generate_calendar_occurrences: {
        Args: { input_from: string; input_through: string }
        Returns: number
      }
      get_current_access: {
        Args: never
        Returns: {
          is_administrator: boolean
          status: Database["public"]["Enums"]["platform_access_status"]
        }[]
      }
      list_household_invitations: {
        Args: { input_household_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          invited_username: string
          role: Database["public"]["Enums"]["household_member_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }[]
      }
      next_interval_successor: {
        Args: { input_anchor: string; input_series_id: string }
        Returns: string
      }
      pause_task_series: {
        Args: { input_series_id: string }
        Returns: {
          assignment_mode: Database["public"]["Enums"]["task_assignment_mode"]
          category_id: string | null
          confirmation_required: boolean
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          effective_from: string
          end_after_occurrences: number | null
          end_at: string | null
          end_type: Database["public"]["Enums"]["task_end_type"]
          fixed_assignee_id: string | null
          household_id: string
          id: string
          missed_policy: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_config: Json
          recurrence_type: Database["public"]["Enums"]["task_recurrence_type"]
          rotation_cursor_updated_at: string | null
          rotation_cursor_user_id: string | null
          series_status: Database["public"]["Enums"]["task_series_status"]
          series_type: Database["public"]["Enums"]["task_series_type"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "task_series"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recalculate_future_assignments: {
        Args: { input_cursor_user_id?: string; input_series_id: string }
        Returns: number
      }
      replace_rotation_roster: {
        Args: { input_member_ids: string[]; input_series_id: string }
        Returns: number
      }
      resume_task_series: {
        Args: { input_series_id: string }
        Returns: {
          assignment_mode: Database["public"]["Enums"]["task_assignment_mode"]
          category_id: string | null
          confirmation_required: boolean
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          effective_from: string
          end_after_occurrences: number | null
          end_at: string | null
          end_type: Database["public"]["Enums"]["task_end_type"]
          fixed_assignee_id: string | null
          household_id: string
          id: string
          missed_policy: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_config: Json
          recurrence_type: Database["public"]["Enums"]["task_recurrence_type"]
          rotation_cursor_updated_at: string | null
          rotation_cursor_user_id: string | null
          series_status: Database["public"]["Enums"]["task_series_status"]
          series_type: Database["public"]["Enums"]["task_series_type"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "task_series"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_household_invitation: {
        Args: { input_invitation_id: string }
        Returns: undefined
      }
      save_task_series: {
        Args: { input: Json }
        Returns: {
          assignment_mode: Database["public"]["Enums"]["task_assignment_mode"]
          category_id: string | null
          confirmation_required: boolean
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          effective_from: string
          end_after_occurrences: number | null
          end_at: string | null
          end_type: Database["public"]["Enums"]["task_end_type"]
          fixed_assignee_id: string | null
          household_id: string
          id: string
          missed_policy: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_config: Json
          recurrence_type: Database["public"]["Enums"]["task_recurrence_type"]
          rotation_cursor_updated_at: string | null
          rotation_cursor_user_id: string | null
          series_status: Database["public"]["Enums"]["task_series_status"]
          series_type: Database["public"]["Enums"]["task_series_type"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "task_series"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_occurrence_assignment_lock: {
        Args: {
          input_expected_version: number
          input_locked: boolean
          input_occurrence_id: string
        }
        Returns: {
          assignee_user_id: string | null
          assignment_locked: boolean
          assignment_source: Database["public"]["Enums"]["task_assignment_source"]
          completed_at: string | null
          completed_by: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          is_all_day: boolean
          lifecycle_state: Database["public"]["Enums"]["task_lifecycle_state"]
          occurrence_key: string
          original_due_end: string
          original_due_start: string
          rotation_override: boolean
          series_id: string
          skip_reason: string | null
          skipped_at: string | null
          skipped_by: string | null
          snoozed_by: string | null
          snoozed_until: string | null
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "task_occurrences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_platform_access_status: {
        Args: {
          decision_reason?: string
          target_status: Database["public"]["Enums"]["platform_access_status"]
          target_user_id: string
        }
        Returns: undefined
      }
      update_category: {
        Args: {
          archive?: boolean
          input_category_id: string
          input_color?: string
          input_name: string
        }
        Returns: {
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string
          household_id: string
          id: string
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "categories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_recurrence_config: {
        Args: {
          input_config: Json
          input_recurrence_type: Database["public"]["Enums"]["task_recurrence_type"]
          input_series_type: Database["public"]["Enums"]["task_series_type"]
        }
        Returns: boolean
      }
    }
    Enums: {
      household_member_role: "full_member" | "guest"
      household_membership_status: "active" | "removed"
      invitation_status: "active" | "accepted" | "revoked" | "expired"
      notification_outbox_status:
        | "pending"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      notification_type:
        | "assigned"
        | "due_soon"
        | "overdue"
        | "completed"
        | "skipped"
        | "snoozed"
        | "new_task"
        | "membership_changed"
      platform_access_status: "pending" | "approved" | "rejected" | "suspended"
      task_assignment_mode: "fixed" | "unassigned" | "round_robin"
      task_assignment_source:
        | "fixed"
        | "unassigned"
        | "round_robin"
        | "claimed"
        | "manual"
      task_end_type: "never" | "on_date" | "after_occurrences"
      task_event_type:
        | "series_created"
        | "series_updated"
        | "series_paused"
        | "series_resumed"
        | "series_deleted"
        | "occurrence_generated"
        | "occurrence_deleted"
        | "assigned"
        | "reassigned"
        | "claimed"
        | "completed"
        | "completion_undone"
        | "reopened"
        | "snoozed"
        | "snooze_changed"
        | "skipped"
        | "cancelled"
        | "rotation_recalculated"
      task_lifecycle_state:
        | "open"
        | "completed"
        | "skipped"
        | "cancelled"
        | "deleted"
      task_missed_policy:
        | "keep_overdue"
        | "skip_when_next_occurrence_begins"
        | "keep_newest"
      task_recurrence_type: "one_time" | "calendar" | "completion_interval"
      task_series_status: "active" | "paused" | "deleted"
      task_series_type: "one_time" | "recurring"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      household_member_role: ["full_member", "guest"],
      household_membership_status: ["active", "removed"],
      invitation_status: ["active", "accepted", "revoked", "expired"],
      notification_outbox_status: [
        "pending",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      notification_type: [
        "assigned",
        "due_soon",
        "overdue",
        "completed",
        "skipped",
        "snoozed",
        "new_task",
        "membership_changed",
      ],
      platform_access_status: ["pending", "approved", "rejected", "suspended"],
      task_assignment_mode: ["fixed", "unassigned", "round_robin"],
      task_assignment_source: [
        "fixed",
        "unassigned",
        "round_robin",
        "claimed",
        "manual",
      ],
      task_end_type: ["never", "on_date", "after_occurrences"],
      task_event_type: [
        "series_created",
        "series_updated",
        "series_paused",
        "series_resumed",
        "series_deleted",
        "occurrence_generated",
        "occurrence_deleted",
        "assigned",
        "reassigned",
        "claimed",
        "completed",
        "completion_undone",
        "reopened",
        "snoozed",
        "snooze_changed",
        "skipped",
        "cancelled",
        "rotation_recalculated",
      ],
      task_lifecycle_state: [
        "open",
        "completed",
        "skipped",
        "cancelled",
        "deleted",
      ],
      task_missed_policy: [
        "keep_overdue",
        "skip_when_next_occurrence_begins",
        "keep_newest",
      ],
      task_recurrence_type: ["one_time", "calendar", "completion_interval"],
      task_series_status: ["active", "paused", "deleted"],
      task_series_type: ["one_time", "recurring"],
    },
  },
} as const
