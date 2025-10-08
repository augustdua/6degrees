-- Migration: Seed Connector Game Data
-- Description: Import initial 1471 jobs from JSON to database
-- NOTE: This is a template. The actual data will be imported via Node.js script

-- This file documents the seeding process
-- Run the Node.js script: npm run seed:connector

-- The script will:
-- 1. Read backend/data/job_graph.json
-- 2. Insert all 1471 jobs into connector_jobs
-- 3. Insert all connections into connector_graph_edges
-- 4. Mark all jobs in main connected component as playable

-- Example of what gets inserted:
/*
INSERT INTO connector_jobs (id, job_title, industry_name, sector_name, job_description, key_skills, responsibilities, is_custom, is_playable)
VALUES
(1, 'Software Engineer', 'Technology', 'Information Technology', 'Develops and maintains software applications...', 'Programming, Problem-solving, Teamwork', 'Write clean code, Debug issues, Collaborate with team', FALSE, TRUE),
(2, 'Data Scientist', 'Technology', 'Information Technology', 'Analyzes complex data to drive business decisions...', 'Statistics, Python, Machine Learning', 'Build models, Analyze data, Present findings', FALSE, TRUE);

INSERT INTO connector_graph_edges (source_job_id, target_job_id, weight)
VALUES
(1, 2, 1.0),
(1, 5, 1.0),
(2, 3, 1.0);
*/

-- After seeding, you should have:
-- - 1471 rows in connector_jobs
-- - ~18,392 rows in connector_graph_edges (undirected, so each edge stored once)
-- - All jobs in main component marked as is_playable = TRUE
