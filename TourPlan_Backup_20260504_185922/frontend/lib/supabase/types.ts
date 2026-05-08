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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agml_scans: {
        Row: {
          chemical_treatment: string | null
          confidence: string | null
          created_at: string
          crop_name: string | null
          dataset_used: string | null
          detected_name: string | null
          id: string
          image_path: string | null
          latitude: number | null
          longitude: number | null
          organic_treatment: string | null
          prevention: string | null
          scan_type: string
          severity: string | null
          user_id: string | null
        }
        Insert: {
          chemical_treatment?: string | null
          confidence?: string | null
          created_at?: string
          crop_name?: string | null
          dataset_used?: string | null
          detected_name?: string | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          longitude?: number | null
          organic_treatment?: string | null
          prevention?: string | null
          scan_type: string
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          chemical_treatment?: string | null
          confidence?: string | null
          created_at?: string
          crop_name?: string | null
          dataset_used?: string | null
          detected_name?: string | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          longitude?: number | null
          organic_treatment?: string | null
          prevention?: string | null
          scan_type?: string
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_advisories: {
        Row: {
          advisory_type: string | null
          confidence_score: number | null
          content: string | null
          created_at: string
          crop_name: string | null
          engine: string
          has_image: boolean | null
          id: string
          image_path: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          query_text: string
          query_type: string | null
          response_text: string | null
          source: string | null
          user_feedback: string | null
          user_id: string | null
          user_rating: number | null
        }
        Insert: {
          advisory_type?: string | null
          confidence_score?: number | null
          content?: string | null
          created_at?: string
          crop_name?: string | null
          engine?: string
          has_image?: boolean | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          query_text: string
          query_type?: string | null
          response_text?: string | null
          source?: string | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Update: {
          advisory_type?: string | null
          confidence_score?: number | null
          content?: string | null
          created_at?: string
          crop_name?: string | null
          engine?: string
          has_image?: boolean | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          query_text?: string
          query_type?: string | null
          response_text?: string | null
          source?: string | null
          user_feedback?: string | null
          user_id?: string | null
          user_rating?: number | null
        }
        Relationships: []
      }
      ai_engine_usage: {
        Row: {
          created_at: string | null
          engine: string
          error: string | null
          id: string
          is_fallback: boolean | null
          request_type: string | null
          response_time_ms: number | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          engine: string
          error?: string | null
          id?: string
          is_fallback?: boolean | null
          request_type?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          engine?: string
          error?: string | null
          id?: string
          is_fallback?: boolean | null
          request_type?: string | null
          response_time_ms?: number | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          phone_number: string
          status: string | null
          user_id: string | null
          vomyra_call_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          phone_number: string
          status?: string | null
          user_id?: string | null
          vomyra_call_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          phone_number?: string
          status?: string | null
          user_id?: string | null
          vomyra_call_id?: string | null
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          ai_engine: string | null
          created_at: string
          detected_intent: string | null
          id: string
          image_url: string | null
          is_voice: boolean | null
          message: string
          role: string
          user_id: string
          voice_language: string | null
        }
        Insert: {
          ai_engine?: string | null
          created_at?: string
          detected_intent?: string | null
          id?: string
          image_url?: string | null
          is_voice?: boolean | null
          message: string
          role: string
          user_id: string
          voice_language?: string | null
        }
        Update: {
          ai_engine?: string | null
          created_at?: string
          detected_intent?: string | null
          id?: string
          image_url?: string | null
          is_voice?: boolean | null
          message?: string
          role?: string
          user_id?: string
          voice_language?: string | null
        }
        Relationships: []
      }
      crop_diagnoses: {
        Row: {
          confidence: number | null
          created_at: string
          crop_name: string | null
          diagnosis: string
          id: string
          image_url: string | null
          remediation: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          crop_name?: string | null
          diagnosis: string
          id?: string
          image_url?: string | null
          remediation?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          crop_name?: string | null
          diagnosis?: string
          id?: string
          image_url?: string | null
          remediation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      crop_health_history: {
        Row: {
          created_at: string
          crop_name: string | null
          diagnosis: string | null
          health_score: number | null
          id: string
          latitude: number | null
          longitude: number | null
          ndvi_score: number | null
          notes: string | null
          plot_name: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          crop_name?: string | null
          diagnosis?: string | null
          health_score?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          ndvi_score?: number | null
          notes?: string | null
          plot_name?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          crop_name?: string | null
          diagnosis?: string | null
          health_score?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          ndvi_score?: number | null
          notes?: string | null
          plot_name?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crop_input_master: {
        Row: {
          application: string | null
          category: string
          created_at: string | null
          crop_name: string
          dosage: string | null
          id: string
          name: string
          organic_alternative: string | null
          stage: string | null
        }
        Insert: {
          application?: string | null
          category: string
          created_at?: string | null
          crop_name: string
          dosage?: string | null
          id?: string
          name: string
          organic_alternative?: string | null
          stage?: string | null
        }
        Update: {
          application?: string | null
          category?: string
          created_at?: string | null
          crop_name?: string
          dosage?: string | null
          id?: string
          name?: string
          organic_alternative?: string | null
          stage?: string | null
        }
        Relationships: []
      }
      crop_master: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
          season: string | null
          soil_type: string | null
          water_requirement: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
          season?: string | null
          soil_type?: string | null
          water_requirement?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          season?: string | null
          soil_type?: string | null
          water_requirement?: string | null
        }
        Relationships: []
      }
      crop_schedules: {
        Row: {
          crop_id: string | null
          crop_name: string | null
          generated_at: string
          id: string
          schedule: string | null
          user_id: string
        }
        Insert: {
          crop_id?: string | null
          crop_name?: string | null
          generated_at?: string
          id?: string
          schedule?: string | null
          user_id: string
        }
        Update: {
          crop_id?: string | null
          crop_name?: string | null
          generated_at?: string
          id?: string
          schedule?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_schedules_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          area_acres: number | null
          created_at: string
          harvest_date: string | null
          id: string
          name: string
          notes: string | null
          sowing_date: string | null
          user_id: string
          variety: string | null
        }
        Insert: {
          area_acres?: number | null
          created_at?: string
          harvest_date?: string | null
          id?: string
          name: string
          notes?: string | null
          sowing_date?: string | null
          user_id: string
          variety?: string | null
        }
        Update: {
          area_acres?: number | null
          created_at?: string
          harvest_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          sowing_date?: string | null
          user_id?: string
          variety?: string | null
        }
        Relationships: []
      }
      disease_master: {
        Row: {
          created_at: string | null
          crop_name: string
          disease_name: string
          id: string
          is_organic: boolean | null
          prevention: string | null
          symptoms: string | null
          treatment: string | null
        }
        Insert: {
          created_at?: string | null
          crop_name: string
          disease_name: string
          id?: string
          is_organic?: boolean | null
          prevention?: string | null
          symptoms?: string | null
          treatment?: string | null
        }
        Update: {
          created_at?: string | null
          crop_name?: string
          disease_name?: string
          id?: string
          is_organic?: boolean | null
          prevention?: string | null
          symptoms?: string | null
          treatment?: string | null
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          is_used: boolean | null
          otp: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          otp: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          otp?: string
        }
        Relationships: []
      }
      farm_plots: {
        Row: {
          area_acres: number | null
          created_at: string
          current_crop: string | null
          id: string
          irrigation_type: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          soil_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          area_acres?: number | null
          created_at?: string
          current_crop?: string | null
          id?: string
          irrigation_type?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          soil_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          area_acres?: number | null
          created_at?: string
          current_crop?: string | null
          id?: string
          irrigation_type?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          soil_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farmbot_planting_plans: {
        Row: {
          avoid_plants: Json | null
          companion_plants: Json | null
          created_at: string
          crop_name: string
          daily_water_liters: number | null
          estimated_yield: string | null
          id: string
          latitude: number | null
          longitude: number | null
          plant_spacing_cm: number | null
          planting_schedule: Json | null
          plot_area_sqm: number | null
          plot_name: string | null
          row_spacing_cm: number | null
          seeds_per_hole: number | null
          sowing_depth_cm: number | null
          total_plants: number | null
          user_id: string | null
          water_per_plant_ml: number | null
          weekly_water_liters: number | null
        }
        Insert: {
          avoid_plants?: Json | null
          companion_plants?: Json | null
          created_at?: string
          crop_name: string
          daily_water_liters?: number | null
          estimated_yield?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          plant_spacing_cm?: number | null
          planting_schedule?: Json | null
          plot_area_sqm?: number | null
          plot_name?: string | null
          row_spacing_cm?: number | null
          seeds_per_hole?: number | null
          sowing_depth_cm?: number | null
          total_plants?: number | null
          user_id?: string | null
          water_per_plant_ml?: number | null
          weekly_water_liters?: number | null
        }
        Update: {
          avoid_plants?: Json | null
          companion_plants?: Json | null
          created_at?: string
          crop_name?: string
          daily_water_liters?: number | null
          estimated_yield?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          plant_spacing_cm?: number | null
          planting_schedule?: Json | null
          plot_area_sqm?: number | null
          plot_name?: string | null
          row_spacing_cm?: number | null
          seeds_per_hole?: number | null
          sowing_depth_cm?: number | null
          total_plants?: number | null
          user_id?: string | null
          water_per_plant_ml?: number | null
          weekly_water_liters?: number | null
        }
        Relationships: []
      }
      farmer_profiles: {
        Row: {
          created_at: string
          district: string | null
          full_name: string | null
          id: string
          land_acres: number | null
          phone: string | null
          phone_verified: boolean | null
          pincode: string | null
          soil_type: string | null
          state: string | null
          updated_at: string
          user_id: string
          vomyra_assistant_id: string | null
        }
        Insert: {
          created_at?: string
          district?: string | null
          full_name?: string | null
          id?: string
          land_acres?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          pincode?: string | null
          soil_type?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          vomyra_assistant_id?: string | null
        }
        Update: {
          created_at?: string
          district?: string | null
          full_name?: string | null
          id?: string
          land_acres?: number | null
          phone?: string | null
          phone_verified?: boolean | null
          pincode?: string | null
          soil_type?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          vomyra_assistant_id?: string | null
        }
        Relationships: []
      }
      insurance_policies: {
        Row: {
          company: string
          created_at: string
          crop_asset: string | null
          end_date: string | null
          id: string
          notes: string | null
          policy_number: string | null
          policy_type: string | null
          premium: number | null
          premium_due_date: string | null
          start_date: string | null
          status: string | null
          sum_insured: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          crop_asset?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string | null
          premium?: number | null
          premium_due_date?: string | null
          start_date?: string | null
          status?: string | null
          sum_insured?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          crop_asset?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          policy_number?: string | null
          policy_type?: string | null
          premium?: number | null
          premium_due_date?: string | null
          start_date?: string | null
          status?: string | null
          sum_insured?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      language_preferences: {
        Row: {
          detected_state: string | null
          id: string
          preferred_language: string | null
          suggested_languages: string[] | null
          updated_at: string | null
          user_id: string | null
          voice_language: string | null
        }
        Insert: {
          detected_state?: string | null
          id?: string
          preferred_language?: string | null
          suggested_languages?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          voice_language?: string | null
        }
        Update: {
          detected_state?: string | null
          id?: string
          preferred_language?: string | null
          suggested_languages?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          voice_language?: string | null
        }
        Relationships: []
      }
      livestock: {
        Row: {
          breed: string | null
          count: number | null
          created_at: string
          id: string
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          breed?: string | null
          count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          type: string
          user_id: string
        }
        Update: {
          breed?: string | null
          count?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      livestock_health_master: {
        Row: {
          created_at: string | null
          disease_name: string
          id: string
          livestock_type: string
          prevention: string | null
          symptoms: string | null
          treatment: string | null
        }
        Insert: {
          created_at?: string | null
          disease_name: string
          id?: string
          livestock_type: string
          prevention?: string | null
          symptoms?: string | null
          treatment?: string | null
        }
        Update: {
          created_at?: string | null
          disease_name?: string
          id?: string
          livestock_type?: string
          prevention?: string | null
          symptoms?: string | null
          treatment?: string | null
        }
        Relationships: []
      }
      livestock_input_master: {
        Row: {
          category: string
          created_at: string | null
          dosage: string | null
          id: string
          livestock_type: string
          name: string
          notes: string | null
          schedule: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          dosage?: string | null
          id?: string
          livestock_type: string
          name: string
          notes?: string | null
          schedule?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          dosage?: string | null
          id?: string
          livestock_type?: string
          name?: string
          notes?: string | null
          schedule?: string | null
        }
        Relationships: []
      }
      loans: {
        Row: {
          amount: number | null
          bank_name: string
          created_at: string
          due_date: string | null
          emi: number | null
          id: string
          interest_rate: number | null
          loan_type: string | null
          notes: string | null
          outstanding: number | null
          sanction_date: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          bank_name: string
          created_at?: string
          due_date?: string | null
          emi?: number | null
          id?: string
          interest_rate?: number | null
          loan_type?: string | null
          notes?: string | null
          outstanding?: number | null
          sanction_date?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          bank_name?: string
          created_at?: string
          due_date?: string | null
          emi?: number | null
          id?: string
          interest_rate?: number | null
          loan_type?: string | null
          notes?: string | null
          outstanding?: number | null
          sanction_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mandi_price_history: {
        Row: {
          arrivals: string | null
          commodity: string
          created_at: string
          date: string
          district: string | null
          id: string
          market: string
          max_price: number | null
          min_price: number | null
          modal_price: number | null
          source: string | null
          state: string
          unit: string | null
        }
        Insert: {
          arrivals?: string | null
          commodity: string
          created_at?: string
          date: string
          district?: string | null
          id?: string
          market: string
          max_price?: number | null
          min_price?: number | null
          modal_price?: number | null
          source?: string | null
          state: string
          unit?: string | null
        }
        Update: {
          arrivals?: string | null
          commodity?: string
          created_at?: string
          date?: string
          district?: string | null
          id?: string
          market?: string
          max_price?: number | null
          min_price?: number | null
          modal_price?: number | null
          source?: string | null
          state?: string
          unit?: string | null
        }
        Relationships: []
      }
      market_watchlist: {
        Row: {
          commodity: string
          created_at: string
          id: string
          market: string | null
          priority: number | null
          user_id: string
        }
        Insert: {
          commodity: string
          created_at?: string
          id?: string
          market?: string | null
          priority?: number | null
          user_id: string
        }
        Update: {
          commodity?: string
          created_at?: string
          id?: string
          market?: string | null
          priority?: number | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      passbook_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string | null
          id: string
          notes: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plantcv_analyses: {
        Row: {
          analysis_method: string | null
          brown_percent: number | null
          created_at: string
          crop_name: string | null
          diagnosis: string
          green_percent: number | null
          health_score: number | null
          id: string
          image_path: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          plant_area_percent: number | null
          plot_name: string | null
          recommendations: Json | null
          user_id: string | null
        }
        Insert: {
          analysis_method?: string | null
          brown_percent?: number | null
          created_at?: string
          crop_name?: string | null
          diagnosis?: string
          green_percent?: number | null
          health_score?: number | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          plant_area_percent?: number | null
          plot_name?: string | null
          recommendations?: Json | null
          user_id?: string | null
        }
        Update: {
          analysis_method?: string | null
          brown_percent?: number | null
          created_at?: string
          crop_name?: string | null
          diagnosis?: string
          green_percent?: number | null
          health_score?: number | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          plant_area_percent?: number | null
          plot_name?: string | null
          recommendations?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          commodity: string
          created_at: string
          direction: string
          id: string
          is_active: boolean | null
          target_price: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          commodity: string
          created_at?: string
          direction: string
          id?: string
          is_active?: boolean | null
          target_price: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          commodity?: string
          created_at?: string
          direction?: string
          id?: string
          is_active?: boolean | null
          target_price?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      satellite_analyses: {
        Row: {
          canopy_cover: number | null
          carbon_score: number | null
          created_at: string
          crop_type: string | null
          health_trend: string | null
          id: string
          irrigation_status: string | null
          last_satellite_date: string | null
          latitude: number
          location_name: string | null
          longitude: number
          ndvi_category: string | null
          ndvi_score: number | null
          plot_id: string | null
          plot_name: string | null
          recommendations: Json | null
          scenes_available: number | null
          soil_moisture: string | null
          user_id: string | null
        }
        Insert: {
          canopy_cover?: number | null
          carbon_score?: number | null
          created_at?: string
          crop_type?: string | null
          health_trend?: string | null
          id?: string
          irrigation_status?: string | null
          last_satellite_date?: string | null
          latitude: number
          location_name?: string | null
          longitude: number
          ndvi_category?: string | null
          ndvi_score?: number | null
          plot_id?: string | null
          plot_name?: string | null
          recommendations?: Json | null
          scenes_available?: number | null
          soil_moisture?: string | null
          user_id?: string | null
        }
        Update: {
          canopy_cover?: number | null
          carbon_score?: number | null
          created_at?: string
          crop_type?: string | null
          health_trend?: string | null
          id?: string
          irrigation_status?: string | null
          last_satellite_date?: string | null
          latitude?: number
          location_name?: string | null
          longitude?: number
          ndvi_category?: string | null
          ndvi_score?: number | null
          plot_id?: string | null
          plot_name?: string | null
          recommendations?: Json | null
          scenes_available?: number | null
          soil_moisture?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      schemes_master: {
        Row: {
          benefits: string | null
          category: string
          created_at: string | null
          eligibility: string | null
          how_to_apply: string | null
          id: string
          is_verified: boolean | null
          name: string
          official_url: string | null
        }
        Insert: {
          benefits?: string | null
          category: string
          created_at?: string | null
          eligibility?: string | null
          how_to_apply?: string | null
          id?: string
          is_verified?: boolean | null
          name: string
          official_url?: string | null
        }
        Update: {
          benefits?: string | null
          category?: string
          created_at?: string | null
          eligibility?: string | null
          how_to_apply?: string | null
          id?: string
          is_verified?: boolean | null
          name?: string
          official_url?: string | null
        }
        Relationships: []
      }
      telephone_otps: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          is_used: boolean | null
          otp: string
          phone: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          is_used?: boolean | null
          otp: string
          phone: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          is_used?: boolean | null
          otp?: string
          phone?: string
        }
        Relationships: []
      }
      tourplan_ai_chat_history: {
        Row: {
          content: string
          context: Json | null
          created_at: string | null
          id: string
          role: string
          tour_guide_context: Json | null
          user_id: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string | null
          id?: string
          role: string
          tour_guide_context?: Json | null
          user_id: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          role?: string
          tour_guide_context?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      tourplan_bookings: {
        Row: {
          booking_type: string
          confirmed_at: string | null
          created_at: string | null
          destination: string | null
          id: string
          is_tatkal: boolean | null
          origin: string | null
          pnr: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          total_amount: number
          total_price: number | null
          trip_data: Json
          trip_details: Json | null
          user_id: string
        }
        Insert: {
          booking_type: string
          confirmed_at?: string | null
          created_at?: string | null
          destination?: string | null
          id?: string
          is_tatkal?: boolean | null
          origin?: string | null
          pnr?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          total_amount: number
          total_price?: number | null
          trip_data: Json
          trip_details?: Json | null
          user_id: string
        }
        Update: {
          booking_type?: string
          confirmed_at?: string | null
          created_at?: string | null
          destination?: string | null
          id?: string
          is_tatkal?: boolean | null
          origin?: string | null
          pnr?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          total_amount?: number
          total_price?: number | null
          trip_data?: Json
          trip_details?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      tourplan_pnr_status_logs: {
        Row: {
          berth: string | null
          booking_id: string
          chart_prepared: boolean | null
          coach: string | null
          created_at: string | null
          id: string
          message: string | null
          pnr: string
          status: string
        }
        Insert: {
          berth?: string | null
          booking_id: string
          chart_prepared?: boolean | null
          coach?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          pnr: string
          status: string
        }
        Update: {
          berth?: string | null
          booking_id?: string
          chart_prepared?: boolean | null
          coach?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          pnr?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "yatra_pnr_status_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tourplan_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      tourplan_profiles: {
        Row: {
          aadhaar_linked: boolean | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string | null
          telegram_enabled: boolean | null
          telegram_id: string | null
          telegram_optin_at: string | null
          travel_style: string | null
          updated_at: string | null
          user_id: string
          vomyra_assistant_id: string | null
        }
        Insert: {
          aadhaar_linked?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          telegram_enabled?: boolean | null
          telegram_id?: string | null
          telegram_optin_at?: string | null
          travel_style?: string | null
          updated_at?: string | null
          user_id: string
          vomyra_assistant_id?: string | null
        }
        Update: {
          aadhaar_linked?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          telegram_enabled?: boolean | null
          telegram_id?: string | null
          telegram_optin_at?: string | null
          travel_style?: string | null
          updated_at?: string | null
          user_id?: string
          vomyra_assistant_id?: string | null
        }
        Relationships: []
      }
      tourplan_search_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          destination: string
          expires_at: string
          id: string
          mode: string
          origin: string | null
          result_count: number | null
          results: Json
          source: string | null
          travel_date: string | null
          updated_at: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          destination: string
          expires_at: string
          id?: string
          mode: string
          origin?: string | null
          result_count?: number | null
          results: Json
          source?: string | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          destination?: string
          expires_at?: string
          id?: string
          mode?: string
          origin?: string | null
          result_count?: number | null
          results?: Json
          source?: string | null
          travel_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tourplan_telegram_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          last_message_at: string | null
          opted_in_at: string | null
          opted_in_source: string | null
          opted_out_at: string | null
          telegram_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          last_message_at?: string | null
          opted_in_at?: string | null
          opted_in_source?: string | null
          opted_out_at?: string | null
          telegram_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          last_message_at?: string | null
          opted_in_at?: string | null
          opted_in_source?: string | null
          opted_out_at?: string | null
          telegram_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tourplan_tour_guide_sessions: {
        Row: {
          budget: number | null
          constraints: string | null
          conversation_summary: string | null
          created_at: string
          departure_date: string | null
          destination: string | null
          discovered_tours: Json | null
          features: string[] | null
          from_city: string | null
          id: string
          language: string
          mix_picks: Json | null
          party_size: Json | null
          phone: string | null
          planner_stage: string | null
          preferences: string[] | null
          return_date: string | null
          selected_tour: Json | null
          trip_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          constraints?: string | null
          conversation_summary?: string | null
          created_at?: string
          departure_date?: string | null
          destination?: string | null
          discovered_tours?: Json | null
          features?: string[] | null
          from_city?: string | null
          id?: string
          language?: string
          mix_picks?: Json | null
          party_size?: Json | null
          phone?: string | null
          planner_stage?: string | null
          preferences?: string[] | null
          return_date?: string | null
          selected_tour?: Json | null
          trip_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          constraints?: string | null
          conversation_summary?: string | null
          created_at?: string
          departure_date?: string | null
          destination?: string | null
          discovered_tours?: Json | null
          features?: string[] | null
          from_city?: string | null
          id?: string
          language?: string
          mix_picks?: Json | null
          party_size?: Json | null
          phone?: string | null
          planner_stage?: string | null
          preferences?: string[] | null
          return_date?: string | null
          selected_tour?: Json | null
          trip_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tourplan_trip_plans: {
        Row: {
          created_at: string | null
          destination: string
          end_date: string | null
          full_plan: Json | null
          hotel: Json | null
          id: string
          local_transport: Json | null
          nights: number | null
          notes: string | null
          origin: string
          start_date: string | null
          status: string | null
          tier_comparison: Json | null
          tier_label: string
          total_amount: number | null
          total_estimate: string
          transport: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          destination: string
          end_date?: string | null
          full_plan?: Json | null
          hotel?: Json | null
          id?: string
          local_transport?: Json | null
          nights?: number | null
          notes?: string | null
          origin: string
          start_date?: string | null
          status?: string | null
          tier_comparison?: Json | null
          tier_label: string
          total_amount?: number | null
          total_estimate: string
          transport?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          destination?: string
          end_date?: string | null
          full_plan?: Json | null
          hotel?: Json | null
          id?: string
          local_transport?: Json | null
          nights?: number | null
          notes?: string | null
          origin?: string
          start_date?: string | null
          status?: string | null
          tier_comparison?: Json | null
          tier_label?: string
          total_amount?: number | null
          total_estimate?: string
          transport?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tourplan_whatsapp_preferences: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          last_message_at: string | null
          opted_in_at: string | null
          opted_in_source: string | null
          opted_out_at: string | null
          phone: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_message_at?: string | null
          opted_in_at?: string | null
          opted_in_source?: string | null
          opted_out_at?: string | null
          phone: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_message_at?: string | null
          opted_in_at?: string | null
          opted_in_source?: string | null
          opted_out_at?: string | null
          phone?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_channel_verification_attempts: {
        Row: {
          challenge_type: string
          channel_address: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json
          provider: string | null
          request_ip: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          challenge_type?: string
          channel_address: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider?: string | null
          request_ip?: string | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_type?: string
          channel_address?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          provider?: string | null
          request_ip?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_channels: {
        Row: {
          channel_address: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          id: string
          is_primary: boolean
          is_verified: boolean
          metadata: Json
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          channel_address: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          metadata?: Json
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          channel_address?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          metadata?: Json
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          device_type: string
          id: string
          last_seen_at: string
          platform: string | null
          screen_width: number | null
          user_id: string
        }
        Insert: {
          device_type: string
          id?: string
          last_seen_at?: string
          platform?: string | null
          screen_width?: number | null
          user_id: string
        }
        Update: {
          device_type?: string
          id?: string
          last_seen_at?: string
          platform?: string | null
          screen_width?: number | null
          user_id?: string
        }
        Relationships: []
      }
      voice_interactions: {
        Row: {
          ai_engine: string | null
          created_at: string
          detected_intent: string | null
          id: string
          input_language: string
          latitude: number | null
          longitude: number | null
          response_language: string | null
          response_text: string | null
          session_duration_ms: number | null
          transcribed_text: string | null
          translated_response: string | null
          tts_used: boolean | null
          user_id: string | null
        }
        Insert: {
          ai_engine?: string | null
          created_at?: string
          detected_intent?: string | null
          id?: string
          input_language?: string
          latitude?: number | null
          longitude?: number | null
          response_language?: string | null
          response_text?: string | null
          session_duration_ms?: number | null
          transcribed_text?: string | null
          translated_response?: string | null
          tts_used?: boolean | null
          user_id?: string | null
        }
        Update: {
          ai_engine?: string | null
          created_at?: string
          detected_intent?: string | null
          id?: string
          input_language?: string
          latitude?: number | null
          longitude?: number | null
          response_language?: string | null
          response_text?: string | null
          session_duration_ms?: number | null
          transcribed_text?: string | null
          translated_response?: string | null
          tts_used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      weather_forecasts: {
        Row: {
          created_at: string | null
          current_condition: string | null
          current_humidity: number | null
          current_temp: number | null
          current_wind: number | null
          fetched_at: string | null
          forecast: Json | null
          id: string
          latitude: number
          location_name: string | null
          longitude: number
          rain_chance: number | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_condition?: string | null
          current_humidity?: number | null
          current_temp?: number | null
          current_wind?: number | null
          fetched_at?: string | null
          forecast?: Json | null
          id?: string
          latitude: number
          location_name?: string | null
          longitude: number
          rain_chance?: number | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_condition?: string | null
          current_humidity?: number | null
          current_temp?: number | null
          current_wind?: number | null
          fetched_at?: string | null
          forecast?: Json | null
          id?: string
          latitude?: number
          location_name?: string | null
          longitude?: number
          rain_chance?: number | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      cleanup_expired_mandi_data: { Args: never; Returns: undefined }
      ensure_farmer_profile: {
        Args: { p_phone?: string; p_user_id: string }
        Returns: undefined
      }
      get_commodity_market_trends: {
        Args: { p_days_lookback?: number; p_search_term?: string }
        Returns: {
          avg_price: number
          commodity: string
          price_change_pct: number
          trend_status: string
        }[]
      }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_full_farmer_summary: { Args: { p_user_id: string }; Returns: Json }
      get_unread_count: { Args: { p_user_id: string }; Returns: number }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      save_ai_advisory: {
        Args: {
          p_advisory_type: string
          p_confidence?: number
          p_content: string
          p_crop: string
          p_source?: string
          p_user_id: string
        }
        Returns: string
      }
      send_sms_vomyra: { Args: { event: Json }; Returns: Json }
      text_to_bytea: { Args: { data: string }; Returns: string }
      upsert_user_device: {
        Args: {
          p_device_type: string
          p_platform?: string
          p_screen_width?: number
          p_user_id: string
        }
        Returns: undefined
      }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      channel_type: "phone_sms" | "whatsapp"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
    Enums: {
      channel_type: ["phone_sms", "whatsapp"],
    },
  },
} as const

