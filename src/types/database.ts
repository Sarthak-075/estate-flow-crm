/**
 * TypeScript definitions for the Phase 1.1 Supabase database schema.
 * Only the tables required for the initial rollout are included.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          created_at: string;
          updated_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          domain?: string | null;
          created_at?: string;
          updated_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          domain?: string | null;
          created_at?: string;
          updated_at?: string | null;
          is_active?: boolean;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          full_name: string | null;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          full_name?: string | null;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          full_name?: string | null;
          email?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      roles: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      permissions: {
        Row: {
          id: string;
          role_id: string;
          resource: string;
          action: string;
          allowed: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          role_id: string;
          resource: string;
          action: string;
          allowed?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          role_id?: string;
          resource?: string;
          action?: string;
          allowed?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      team_members: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string;
          role_id: string;
          invited_at: string | null;
          status: 'active' | 'pending' | 'removed';
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          profile_id: string;
          role_id: string;
          invited_at?: string | null;
          status?: 'active' | 'pending' | 'removed';
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          profile_id?: string;
          role_id?: string;
          invited_at?: string | null;
          status?: 'active' | 'pending' | 'removed';
          created_at?: string;
          updated_at?: string | null;
        };
      };
      organization_settings: {
        Row: {
          id: string;
          organization_id: string;
          timezone: string;
          business_hours: Json | null;
          sla_first_response_minutes: number;
          sla_followup_minutes: number;
          branding: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          timezone?: string;
          business_hours?: Json | null;
          sla_first_response_minutes?: number;
          sla_followup_minutes?: number;
          branding?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          timezone?: string;
          business_hours?: Json | null;
          sla_first_response_minutes?: number;
          sla_followup_minutes?: number;
          branding?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          before: Json | null;
          after: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: never; // audit logs are immutable
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}

// Helper types for generic usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
