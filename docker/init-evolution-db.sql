-- Create Evolution API database if it doesn't exist
-- This script runs on first PostgreSQL startup
SELECT 'CREATE DATABASE evolution_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution_db')\gexec

-- Create the schema in evolution_db
\c evolution_db
CREATE SCHEMA IF NOT EXISTS evolution_api;
