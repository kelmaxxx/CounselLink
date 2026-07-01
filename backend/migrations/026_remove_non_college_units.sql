-- 026_remove_non_college_units.sql
-- Division of Engineering Technology (DET) and Institute of Science Education (ISED)
-- are not undergraduate colleges at MSU-Main, so they are removed from the college
-- reference data. FK ON DELETE CASCADE drops their departments and courses too.
-- Idempotent: a no-op on databases where they were never seeded.
USE counselink;

DELETE FROM colleges WHERE code IN ('DET', 'ISED');
