-- Add last_analysis_date field to users table
ALTER TABLE "sessions_users" 
ADD COLUMN IF NOT EXISTS "last_analysis_date" TIMESTAMP;

-- Add index for performance optimization when checking analysis eligibility
CREATE INDEX IF NOT EXISTS "users_last_analysis_date_idx" ON "sessions_users" ("last_analysis_date"); 