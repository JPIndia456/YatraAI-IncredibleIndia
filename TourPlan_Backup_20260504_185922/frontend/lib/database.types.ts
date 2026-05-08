/**
 * TourPlan Database Types
 * Generated manually to align with Schema V003
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tourplan_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone: string | null
          aadhaar_linked: boolean | null
          preferred_language: string | null
          travel_style: string | null
          avatar_url: string | null
          whatsapp_enabled: boolean
          whatsapp_phone: string | null
          whatsapp_optin_at: string | null
          language_code: string
          legal_accepted_at: string | null
          legal_version: string | null
          total_trips: number
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone?: string | null
          aadhaar_linked?: boolean | null
          preferred_language?: string | null
          travel_style?: string | null
          avatar_url?: string | null
          whatsapp_enabled?: boolean
          whatsapp_phone?: string | null
          whatsapp_optin_at?: string | null
          language_code?: string
          legal_accepted_at?: string | null
          legal_version?: string | null
          total_trips?: number
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone?: string | null
          aadhaar_linked?: boolean | null
          preferred_language?: string | null
          travel_style?: string | null
          avatar_url?: string | null
          whatsapp_enabled?: boolean
          whatsapp_phone?: string | null
          whatsapp_optin_at?: string | null
          language_code?: string
          legal_accepted_at?: string | null
          legal_version?: string | null
          total_trips?: number
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tourplan_bookings: {
        Row: {
          id: string
          user_id: string
          booking_type: 'TRAIN' | 'FLIGHT' | 'BUS' | 'TAXI' | 'HOTEL'
          status: 'PENDING' | 'PAID' | 'UPCOMING' | 'COMPLETED' | 'FAILED'
          total_amount: number
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          pnr: string | null
          trip_data: Json
          is_tatkal: boolean
          confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          booking_type: 'TRAIN' | 'FLIGHT' | 'BUS' | 'TAXI' | 'HOTEL'
          status?: 'PENDING' | 'PAID' | 'UPCOMING' | 'COMPLETED' | 'FAILED'
          total_amount: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          pnr?: string | null
          trip_data: Json
          is_tatkal?: boolean
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          booking_type?: 'TRAIN' | 'FLIGHT' | 'BUS' | 'TAXI' | 'HOTEL'
          status?: 'PENDING' | 'PAID' | 'UPCOMING' | 'COMPLETED' | 'FAILED'
          total_amount?: number
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          pnr?: string | null
          trip_data?: Json
          is_tatkal?: boolean
          confirmed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tourplan_pnr_status_logs: {
        Row: {
          id: string
          booking_id: string
          pnr: string
          status: string
          coach: string | null
          berth: string | null
          chart_prepared: boolean
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          pnr: string
          status: string
          coach?: string | null
          berth?: string | null
          chart_prepared?: boolean
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          pnr?: string
          status?: string
          coach?: string | null
          berth?: string | null
          chart_prepared?: boolean
          message?: string | null
          created_at?: string
        }
      }
      tourplan_whatsapp_preferences: {
        Row: {
          id: string
          user_id: string
          phone: string
          enabled: boolean
          opted_in_at: string
          opted_out_at: string | null
          opted_in_source: string
          last_message_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone: string
          enabled?: boolean
          opted_in_at?: string
          opted_out_at?: string | null
          opted_in_source?: string
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone?: string
          enabled?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          opted_in_source?: string
          last_message_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tourplan_whatsapp_log: {
        Row: {
          id: string
          wa_id: string
          user_id: string | null
          input: string
          output: string
          intent_english: string | null
          msg_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          wa_id: string
          user_id?: string | null
          input: string
          output: string
          intent_english?: string | null
          msg_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          wa_id?: string
          user_id?: string | null
          input?: string
          output?: string
          intent_english?: string | null
          msg_id?: string | null
          status?: string
          created_at?: string
        }
      },
      tourplan_notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          created_at?: string
        }
      },
      tourplan_price_checks: {
        Row: {
          id: string
          user_id: string | null
          booking_ref: string | null
          origin: string | null
          destination: string | null
          transport_mode: string | null
          tier: string | null
          original_price: number
          verified_price: number
          price_changed: boolean
          change_percent: number | null
          change_reason: string | null
          price_token: string | null
          payment_preceded: boolean
          checked_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          booking_ref?: string | null
          origin?: string | null
          destination?: string | null
          transport_mode?: string | null
          tier?: string | null
          original_price: number
          verified_price: number
          price_changed?: boolean
          change_percent?: number | null
          change_reason?: string | null
          price_token?: string | null
          payment_preceded?: boolean
          checked_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          booking_ref?: string | null
          origin?: string | null
          destination?: string | null
          transport_mode?: string | null
          tier?: string | null
          original_price?: number
          verified_price?: number
          price_changed?: boolean
          change_percent?: number | null
          change_reason?: string | null
          price_token?: string | null
          payment_preceded?: boolean
          checked_at?: string
        }
      }
      tourplan_ai_chat_history: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          context: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          context?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant'
          content?: string
          context?: Json
          created_at?: string
        }
      }
      tourplan_cookie_consents: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          consent_level: 'essential' | 'all'
          policy_version: string
          ip_address: string | null
          user_agent: string | null
          withdrawn: boolean
          withdrawn_at: string | null
          consented_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          consent_level: 'essential' | 'all'
          policy_version?: string
          ip_address?: string | null
          user_agent?: string | null
          withdrawn?: boolean
          withdrawn_at?: string | null
          consented_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          consent_level?: 'essential' | 'all'
          policy_version?: string
          ip_address?: string | null
          user_agent?: string | null
          withdrawn?: boolean
          withdrawn_at?: string | null
          consented_at?: string | null
          created_at?: string
        }
      }
      tourplan_legal_acceptances: {
        Row: {
          id: string
          user_id: string | null
          document_type: 'terms' | 'privacy' | 'disclaimer' | 'refund'
          document_version: string
          accepted: boolean
          accepted_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          document_type: 'terms' | 'privacy' | 'disclaimer' | 'refund'
          document_version?: string
          accepted?: boolean
          accepted_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          document_type?: 'terms' | 'privacy' | 'disclaimer' | 'refund'
          document_version?: string
          accepted?: boolean
          accepted_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      tourplan_search_cache: {
        Row: {
          id: string
          cache_key: string
          mode: 'trains' | 'flights' | 'buses' | 'hotels' | 'taxis'
          origin: string | null
          destination: string
          travel_date: string | null
          results: Json
          result_count: number
          source: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          mode: 'trains' | 'flights' | 'buses' | 'hotels' | 'taxis'
          origin?: string | null
          destination: string
          travel_date?: string | null
          results: Json
          result_count?: number
          source?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          mode?: 'trains' | 'flights' | 'buses' | 'hotels' | 'taxis'
          origin?: string | null
          destination?: string
          travel_date?: string | null
          results?: Json
          result_count?: number
          source?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      tourplan_trip_plans: {
        Row: {
          id: string
          user_id: string | null
          origin: string
          destination: string
          start_date: string | null
          end_date: string | null
          nights: number
          tier_label: string
          total_estimate: string
          total_amount: number
          transport: Json
          hotel: Json
          local_transport: Json
          full_plan: Json
          tier_comparison: Json | null
          status: 'saved' | 'booked' | 'cancelled' | 'completed'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          origin: string
          destination: string
          start_date?: string | null
          end_date?: string | null
          nights?: number
          tier_label: string
          total_estimate: string
          total_amount?: number
          transport?: Json
          hotel?: Json
          local_transport?: Json
          full_plan?: Json
          tier_comparison?: Json | null
          status?: 'saved' | 'booked' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          origin?: string
          destination?: string
          start_date?: string | null
          end_date?: string | null
          nights?: number
          tier_label?: string
          total_estimate?: string
          total_amount?: number
          transport?: Json
          hotel?: Json
          local_transport?: Json
          full_plan?: Json
          tier_comparison?: Json | null
          status?: 'saved' | 'booked' | 'cancelled' | 'completed'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: void
      },
      mark_notification_read: {
        Args: { notification_id: string }
        Returns: void
      },
      upsert_whatsapp_optin: {
        Args: {
          p_user_id: string
          p_phone: string
          p_enabled: boolean
          p_source?: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ── Convenience Helper Types ────────────────────────────────────────────────
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type Profile = Tables<'tourplan_profiles'>
export type Booking = Tables<'tourplan_bookings'>
export type PNRLog = Tables<'tourplan_pnr_status_logs'>
export type WhatsAppPreference = Tables<'tourplan_whatsapp_preferences'>
export type WhatsAppLog = Tables<'tourplan_whatsapp_log'>
export type PriceCheck = Tables<'tourplan_price_checks'>
export type ChatHistory = Tables<'tourplan_ai_chat_history'>
export type CookieConsent = Tables<'tourplan_cookie_consents'>
export type LegalAcceptance = Tables<'tourplan_legal_acceptances'>
export type TripPlan = Tables<'tourplan_trip_plans'>
export type SearchCache = Tables<'tourplan_search_cache'>
