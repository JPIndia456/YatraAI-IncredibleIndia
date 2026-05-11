-- Fix missing columns for Telegram and Trip Saving
-- Run this in your Supabase SQL Editor if you see "column not found" errors in logs.

-- 1. Profiles Table
ALTER TABLE public.yatra_profiles 
ADD COLUMN IF NOT EXISTS telegram_optin_at timestamptz,
ADD COLUMN IF NOT EXISTS telegram_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS telegram_id text;

-- 2. Trip Plans Table
ALTER TABLE public.yatra_trip_plans 
ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0;

-- 3. Bookings Table (Ensuring all columns for Trip Persistence exist)
ALTER TABLE public.yatra_bookings
ADD COLUMN IF NOT EXISTS tier text,
ADD COLUMN IF NOT EXISTS total_pax integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS pnr text,
ADD COLUMN IF NOT EXISTS passengers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
