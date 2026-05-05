USE counselink;

-- Passwords:
--   admin@msu.edu.ph         → admin123
--   counselor*@msu.edu.ph    → counselor123
--   rep*@msu.edu.ph          → rep123

INSERT INTO users (name, email, password, role, status, college) VALUES
  -- Admin (no college needed)
  ('Director Lucman',       'admin@msu.edu.ph',        '$2b$10$yKwUlbuPJh6l80nZAyND7uaNMM0lavTcw6b0gjL5SPIjySUbODcrC', 'admin',       'approved', NULL),

  -- Counselors (one per college block)
  ('Sir Lucs',              'counselor@msu.edu.ph',    '$2b$10$cwii6h49NnL4ZO205IgjheCJucIaDUVFxo8Yj5PZK5diVxRdA8.DO', 'counselor',   'approved', 'CICS'),
  ('Dr. Ahmed Rahman',      'counselor2@msu.edu.ph',   '$2b$10$cwii6h49NnL4ZO205IgjheCJucIaDUVFxo8Yj5PZK5diVxRdA8.DO', 'counselor',   'approved', 'COE'),
  ('Dr. Laila Macatotong',  'counselor3@msu.edu.ph',   '$2b$10$cwii6h49NnL4ZO205IgjheCJucIaDUVFxo8Yj5PZK5diVxRdA8.DO', 'counselor',   'approved', 'CBAA'),
  ('Dr. Jose Perez',        'counselor4@msu.edu.ph',   '$2b$10$cwii6h49NnL4ZO205IgjheCJucIaDUVFxo8Yj5PZK5diVxRdA8.DO', 'counselor',   'approved', 'CHS'),

  -- College Representatives
  ('Prof. Ahmed Ali',       'rep@msu.edu.ph',          '$2b$10$djV80xvymhEEneeSC7sktuMp65XvXMORxbNCWN3QIeb2hZkuzsXma', 'college_rep', 'approved', 'COE'),
  ('Prof. Macatotong',      'rep2@msu.edu.ph',         '$2b$10$djV80xvymhEEneeSC7sktuMp65XvXMORxbNCWN3QIeb2hZkuzsXma', 'college_rep', 'approved', 'CICS'),
  ('Prof. Liza Cruz',       'rep3@msu.edu.ph',         '$2b$10$djV80xvymhEEneeSC7sktuMp65XvXMORxbNCWN3QIeb2hZkuzsXma', 'college_rep', 'approved', 'CBAA');

