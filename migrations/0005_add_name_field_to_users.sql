-- Add name field to users table for settings screen
-- This provides a single name field that users can edit in their profile
ALTER TABLE "sessions_users" 
ADD COLUMN IF NOT EXISTS "name" VARCHAR;

-- Add index for name field for performance when searching/sorting users
CREATE INDEX IF NOT EXISTS "users_name_idx" ON "sessions_users" ("name"); 