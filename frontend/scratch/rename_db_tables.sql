-- Fix: Rename all legacy TourPlan tables to Yatra
-- Run this in the Supabase SQL Editor if you see "table not found" errors.

DO $$ 
DECLARE 
    tbl RECORD;
BEGIN
    -- 1. Rename tables from tourplan_ to yatra_
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename LIKE 'tourplan_%'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I RENAME TO %I', 
                           tbl.tablename, 
                           replace(tbl.tablename, 'tourplan_', 'yatra_'));
            RAISE NOTICE 'Renamed % to %', tbl.tablename, replace(tbl.tablename, 'tourplan_', 'yatra_');
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not rename %: %', tbl.tablename, SQLERRM;
        END;
    END LOOP;

    -- 2. Handle specific column renames for backward compatibility if any
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yatra_bookings' AND column_name = 'trip_data') THEN
        ALTER TABLE public.yatra_bookings RENAME COLUMN trip_data TO trip_details;
    END IF;
END $$;
