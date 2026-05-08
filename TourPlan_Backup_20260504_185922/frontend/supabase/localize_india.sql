-- YatraAI: Localization Patch (India Region)
-- Sets the primary database behavior to align with Indian standards

-- 1. Set System Timezone to IST (Asia/Kolkata)
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';

-- 2. Update existing tables to ensure Indian defaults
ALTER TABLE yatra_profiles 
  ALTER COLUMN language_code SET DEFAULT 'hin',
  ALTER COLUMN preferred_language SET DEFAULT 'hi';

ALTER TABLE yatra_trip_plans
  ALTER COLUMN origin SET DEFAULT 'India';

-- 3. Ensure currency-related columns use appropriate numeric precision for INR
-- (Already handled by numeric/int in most cases, but ensuring no rounding issues)

-- 4. Verify Timezone change for the current session
SELECT now() as local_time_check;
