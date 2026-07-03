USE counselink;

ALTER TABLE appointments
  MODIFY COLUMN status ENUM('pending','approved','rejected','rescheduled','completed','no_show') DEFAULT 'pending';
