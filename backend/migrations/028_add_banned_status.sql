ALTER TABLE users
  MODIFY COLUMN status
    ENUM('pending_approval','approved','rejected','banned')
    DEFAULT 'approved';
