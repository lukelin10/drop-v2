-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create question table
CREATE TABLE IF NOT EXISTS "question" (
    "id" SERIAL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create drops table
CREATE TABLE IF NOT EXISTS "drops" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "userId" INTEGER,
    "questionId" INTEGER,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "users"("id"),
    FOREIGN KEY ("questionId") REFERENCES "question"("id")
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" SERIAL PRIMARY KEY,
    "dropId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "fromUser" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("dropId") REFERENCES "drops"("id")
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "drops_userId_idx" ON "drops" ("userId");
CREATE INDEX IF NOT EXISTS "drops_questionId_idx" ON "drops" ("questionId");
CREATE INDEX IF NOT EXISTS "messages_dropId_idx" ON "messages" ("dropId");