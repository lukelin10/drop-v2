-- Performance optimization indexes for analysis feature

-- Composite index for drops eligibility queries (user_id + created_at)
-- This optimizes queries like: WHERE user_id = ? AND created_at > ?
CREATE INDEX IF NOT EXISTS "drops_user_created_idx" ON "drops" ("user_id", "created_at");

-- Index on drops.created_at for temporal ordering queries
CREATE INDEX IF NOT EXISTS "drops_created_at_idx" ON "drops" ("created_at");

-- Composite index for messages temporal queries by drop
CREATE INDEX IF NOT EXISTS "messages_drop_created_idx" ON "messages" ("drop_id", "created_at");

-- Composite index for analysis-drops joins (improves analysis drop retrieval)  
CREATE INDEX IF NOT EXISTS "analysis_drops_composite_idx" ON "analysis_drops" ("analysis_id", "drop_id", "created_at");

-- Index on users table for analysis-related queries
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "sessions_users" ("created_at");

-- Composite index for user analyses with favorites filtering
CREATE INDEX IF NOT EXISTS "analyses_user_favorited_created_idx" ON "analyses" ("user_id", "is_favorited", "created_at"); 