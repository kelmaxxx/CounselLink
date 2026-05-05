CREATE DATABASE IF NOT EXISTS counselink;
USE counselink;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student','counselor','admin','college_rep') NOT NULL,
  status ENUM('pending_approval','approved','rejected') DEFAULT 'approved',
  college VARCHAR(50),
  student_id VARCHAR(30),
  phone VARCHAR(30),
  cor_url VARCHAR(255),
  cor_file_name VARCHAR(255),
  cor_file_type VARCHAR(100),
  program VARCHAR(120),
  year_level VARCHAR(30),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  counselor_id INT NULL,
  appointment_type ENUM('counseling','psychological_test') NOT NULL,
  preferred_date DATE,
  preferred_time TIME,
  preferred_slots VARCHAR(255),
  scheduled_date DATE,
  scheduled_time VARCHAR(20),
  status ENUM('pending','approved','rejected','rescheduled') DEFAULT 'pending',
  reason TEXT,
  phone_number VARCHAR(30),
  is_urgent TINYINT(1) DEFAULT 0,
  counselor_action_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  status ENUM('read','unread') DEFAULT 'unread',
  link VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  content TEXT NOT NULL,
  date_posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS test_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointment_id INT NULL,
  student_id INT NOT NULL,
  counselor_id INT NOT NULL,
  test_name VARCHAR(120) NOT NULL,
  completed_date DATE NOT NULL,
  summary TEXT,
  recommendations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (counselor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  content TEXT NOT NULL,
  status ENUM('read','unread') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);
