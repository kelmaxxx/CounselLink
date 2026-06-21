-- Migration 019: Add a quick 1-5 star "rating" field to the Client Feedback
-- Form, shown at the bottom of the form alongside the existing Likert items.
-- Run on existing databases. New installs get this from schema.sql automatically.

USE counselink;

ALTER TABLE client_feedback_forms ADD COLUMN rating TINYINT NULL AFTER would_recommend;
