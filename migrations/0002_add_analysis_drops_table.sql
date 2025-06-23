-- Create analysis_drops junction table
CREATE TABLE IF NOT EXISTS "analysis_drops" (
    "id" SERIAL PRIMARY KEY,
    "analysis_id" INTEGER NOT NULL,
    "drop_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE,
    FOREIGN KEY ("drop_id") REFERENCES "drops"("id") ON DELETE CASCADE,
    UNIQUE("analysis_id", "drop_id")
);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS "analysis_drops_analysis_id_idx" ON "analysis_drops" ("analysis_id");
CREATE INDEX IF NOT EXISTS "analysis_drops_drop_id_idx" ON "analysis_drops" ("drop_id"); 