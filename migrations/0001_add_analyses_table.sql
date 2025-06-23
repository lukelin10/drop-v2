-- Create analyses table
CREATE TABLE IF NOT EXISTS "analyses" (
    "id" SERIAL PRIMARY KEY,
    "user_id" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bullet_points" TEXT NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "is_favorited" BOOLEAN DEFAULT false NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "sessions_users"("id")
);

-- Add indexes for performance optimization (as mentioned in task 1.6)
CREATE INDEX IF NOT EXISTS "analyses_user_id_idx" ON "analyses" ("user_id");
CREATE INDEX IF NOT EXISTS "analyses_created_at_idx" ON "analyses" ("created_at");
CREATE INDEX IF NOT EXISTS "analyses_is_favorited_idx" ON "analyses" ("is_favorited"); 