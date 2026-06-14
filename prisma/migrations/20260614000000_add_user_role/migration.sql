-- M-007: Add role column to User table
-- Default 'admin' ensures existing users keep their current access level
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'admin';
