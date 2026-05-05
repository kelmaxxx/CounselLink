export const COLLEGES = ['CICS', 'COE', 'CBAA', 'CHS', 'CED', 'COL', 'COA', 'CNSM', 'CSSH', 'CPA', 'KFCIASS','CFES', 'CFAS', 'CHTM'];

export const MOCK_USERS = [
  // Admin
  { id: 1, name: 'Director Lucman', email: 'admin@msu.edu.ph', password: 'admin123', role: 'admin', employeeId: '900000001' },

  // Counselors
  { 
    id: 2, 
    name: 'Sir Lucs', 
    email: 'counselor@msu.edu.ph', 
    password: 'counselor123', 
    role: 'counselor', 
    college: null, 
    employeeId: '900000101',
    specialization: 'Academic Counseling',
    bio: 'Passionate about helping students achieve their academic goals and personal growth.'
  },
  { 
    id: 3, 
    name: 'Dr. Ahmed Rahman', 
    email: 'counselor2@msu.edu.ph', 
    password: 'counselor123', 
    role: 'counselor', 
    college: null, 
    employeeId: '900000102',
    specialization: 'Career Guidance',
    bio: 'Experienced career counselor dedicated to guiding students toward successful careers.'
  },
  { 
    id: 4, 
    name: 'Dr. Laila M.', 
    email: 'counselor3@msu.edu.ph', 
    password: 'counselor123', 
    role: 'counselor', 
    college: null, 
    employeeId: '900000103',
    specialization: 'Mental Health Support',
    bio: 'Specializing in mental health and emotional well-being of students.'
  },
  { 
    id: 5, 
    name: 'Dr. Jose Perez', 
    email: 'counselor4@msu.edu.ph', 
    password: 'counselor123', 
    role: 'counselor', 
    college: null, 
    employeeId: '900000104',
    specialization: 'Psychological Testing',
    bio: 'Expert in psychological assessment and evaluation.'
  },

  // College reps
  { id: 6, name: 'Prof. Ahmed Ali', email: 'rep2@msu.edu.ph', password: 'rep123', role: 'college_rep', college: 'COE', employeeId: '900000201' },
  { id: 7, name: 'Prof. Macatotong', email: 'rep@msu.edu.ph', password: 'rep123', role: 'college_rep', college: 'CICS', employeeId: '900000202' },
  { id: 8, name: 'Prof. Liza Cruz', email: 'rep3@msu.edu.ph', password: 'rep123', role: 'college_rep', college: 'CBAA', employeeId: '900000203' },

  // Students
  { 
    id: 9, 
    name: 'Abdul Malik', 
    email: 'student1@msu.edu.ph', 
    password: 'pass123', 
    role: 'student', 
    college: 'CICS', 
    studentId: '202329207',
    program: 'BS Computer Science',
    yearLevel: '3rd Year'
  },
  { 
    id: 10, 
    name: 'Maria Santos', 
    email: 'student2@msu.edu.ph', 
    password: 'pass123', 
    role: 'student', 
    college: 'COE', 
    studentId: '202329208',
    program: 'BS Civil Engineering',
    yearLevel: '2nd Year'
  },
  { 
    id: 11, 
    name: 'Ahmad Hassan', 
    email: 'student3@msu.edu.ph', 
    password: 'pass123', 
    role: 'student', 
    college: 'CBAA', 
    studentId: '202329209',
    program: 'BS Business Administration',
    yearLevel: '4th Year'
  },
];