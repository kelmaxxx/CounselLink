-- Migration 046: Repair contradictory authorization state.
-- Re-signing consent clears disclaimerRevokedAt, but saving an inventory form
-- loaded before the re-sign could write the stale revocation timestamp back.
-- A revoked authorization always sets disclaimerAgreed = false, so
-- agreed = true + a revoked timestamp can only be stale data.

UPDATE student_inventories
SET form_data = JSON_REMOVE(form_data, '$.acknowledgment.disclaimerRevokedAt')
WHERE JSON_EXTRACT(form_data, '$.acknowledgment.disclaimerAgreed') = TRUE
  AND JSON_EXTRACT(form_data, '$.acknowledgment.disclaimerRevokedAt') IS NOT NULL;
