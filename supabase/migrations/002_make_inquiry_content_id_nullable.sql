-- Phase 9: webhook comments don't have a specific content association
ALTER TABLE inquiries ALTER COLUMN content_id DROP NOT NULL;
