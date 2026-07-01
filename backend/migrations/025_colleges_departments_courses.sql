-- 025_colleges_departments_courses.sql
-- Reference tables mirroring the MSU College -> Department -> Course hierarchy
-- (source: "msu main - colleges dep and courses.xlsx"). Mirrors the frontend
-- data module frontend/src/data/msuColleges.js. Idempotent + re-seedable.
USE counselink;

CREATE TABLE IF NOT EXISTS colleges (
  code VARCHAR(16) PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  college_code VARCHAR(16) NOT NULL,
  code VARCHAR(24) NOT NULL,
  name VARCHAR(160) NOT NULL,
  UNIQUE KEY uniq_college_dept (college_code, name),
  INDEX idx_dept_college (college_code),
  CONSTRAINT fk_departments_college FOREIGN KEY (college_code) REFERENCES colleges(code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  UNIQUE KEY uniq_dept_course (department_id, name),
  INDEX idx_course_dept (department_id),
  CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Re-seed cleanly (child rows cascade).
DELETE FROM colleges;

INSERT INTO colleges (code, name) VALUES ('COA', 'College of Agriculture');
INSERT INTO departments (college_code, code, name) VALUES ('COA', 'AM', 'Agribusiness Management Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agribusiness Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agricultural Business Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agriculture major in Agricultural Food Processing');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSA major in Food Processing');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'DABMT-Food Processing');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Agribusiness Management (MAM)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Science in Agribusiness Management (MSAM)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Science in Agribusiness Management (MSAM)  New');
INSERT INTO departments (college_code, code, name) VALUES ('COA', 'AEE', 'Agricultural Education and Extension Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agriculture major in Extension Education');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSA Agricultural Extension');
INSERT INTO departments (college_code, code, name) VALUES ('COA', 'AS', 'Animal Science Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agriculture (Major in Animal Science)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Animal Science');
INSERT INTO departments (college_code, code, name) VALUES ('COA', 'PS', 'Plant Science Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agriculture major in Agronomy');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSA Farming Systems');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSA Farming Systems (RT Lim)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSA Horticulture');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSA Soil Science');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'DAT Crop Production Technology');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Farming Systems');

INSERT INTO colleges (code, name) VALUES ('CBAA', 'College of Business Administration and Accountancy');
INSERT INTO departments (college_code, code, name) VALUES ('CBAA', 'A', 'Accountancy Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Accountancy');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration specialized in Financial Management');
INSERT INTO departments (college_code, code, name) VALUES ('CBAA', 'E', 'Economics Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSBA Business Economics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration specialized in Islamic Banking and Finance');
INSERT INTO departments (college_code, code, name) VALUES ('CBAA', 'M', 'Management Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSBA Human Resource Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration specialized in Human Resource Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration specialized in Organizational Leadership and Management');
INSERT INTO departments (college_code, code, name) VALUES ('CBAA', 'M2', 'Marketing Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Entrepreneurship');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSBA Marketing Management (Advertising)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSBA Marketing Management (Digital Marketing)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration specialized in Marketing Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Business Administration specialized in Sustainable Enterprise Development');

INSERT INTO colleges (code, name) VALUES ('CED', 'College of Education');
INSERT INTO departments (college_code, code, name) VALUES ('CED', 'EE', 'Elementary Education Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Bachelor of Early Chilhood Education (BECEd)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Bachelor of Elementary Education (BEEd)');
INSERT INTO departments (college_code, code, name) VALUES ('CED', 'G-CED', 'Graduate (CED)');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Education (Guidance & Counselling)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Education (Reading)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Education (School Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MAEd- Educational Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MAEd- Guidance and Counseling');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MAEd- Reading');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D Educational Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'PhD- Educational Management (Academic Track)');
INSERT INTO departments (college_code, code, name) VALUES ('CED', 'HE', 'Home Economics Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BTLEd Home Economics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BTVTEd Home Economics');
INSERT INTO departments (college_code, code, name) VALUES ('CED', 'SE', 'Secondary Education Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSEd English');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSEd Filipino');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSEd Mathematics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSEd Sciences');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSEd Social Studies');

INSERT INTO colleges (code, name) VALUES ('COE', 'College of Engineering');
INSERT INTO departments (college_code, code, name) VALUES ('COE', 'AE', 'Agricultural Engineering Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Agricultural and Biosystems Engineering');
INSERT INTO departments (college_code, code, name) VALUES ('COE', 'CE', 'Chemical Engineering Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Chemical Engineering');
INSERT INTO departments (college_code, code, name) VALUES ('COE', 'CE2', 'Civil Engineering Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Civil Engineering');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Civil Engineering (Structural)');
INSERT INTO departments (college_code, code, name) VALUES ('COE', 'EE', 'Electrical Engineering Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Electrical Engineering');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Electronics Engineering');
INSERT INTO departments (college_code, code, name) VALUES ('COE', 'ME', 'Mechanical Engineering Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Mechanical Engineering');

INSERT INTO colleges (code, name) VALUES ('CFAS', 'College of Fisheries and Aquatic Sciences');
INSERT INTO departments (college_code, code, name) VALUES ('CFAS', 'F', 'Fisheries Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Fisheries');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Science in Aquaculture (Academic Track)');
INSERT INTO departments (college_code, code, name) VALUES ('CFAS', 'FT', 'Fisheries Technology');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Diploma in Fisheries Technology (Ladderized Program) Major in Aquaculture');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Diploma in Fisheries Technology (Ladderized Program) Major in Fish Processing');

INSERT INTO colleges (code, name) VALUES ('CFES', 'College of Forestry and Environmental Studies');
INSERT INTO departments (college_code, code, name) VALUES ('CFES', 'ES', 'Environmental Studies Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Environmental Science');
INSERT INTO departments (college_code, code, name) VALUES ('CFES', 'F', 'Forestry Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Forestry');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Forestry major in Agroforestry');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in EcoGovernance and Social Forestry');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Science in Forestry');

INSERT INTO colleges (code, name) VALUES ('CHS', 'College of Health Sciences');
INSERT INTO departments (college_code, code, name) VALUES ('CHS', 'G-CHS', 'Graduate (CHS)');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Nursing (Nursing Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Nursing (Nursing Administration)');
INSERT INTO departments (college_code, code, name) VALUES ('CHS', 'M', 'Midwifery Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Midwifery');
INSERT INTO departments (college_code, code, name) VALUES ('CHS', 'N', 'Nursing Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Nursing');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Pharmacy');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Doctor of Science in Nursing - Major in Gerontology Nursing');

INSERT INTO colleges (code, name) VALUES ('CHTM', 'College of Hospitality and Tourism Management');
INSERT INTO departments (college_code, code, name) VALUES ('CHTM', 'HM', 'Hospitality Management Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Hospitality Management');
INSERT INTO departments (college_code, code, name) VALUES ('CHTM', 'TM', 'Tourism Management Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Tourism Management');

INSERT INTO colleges (code, name) VALUES ('CICS', 'College of Information and Computing Sciences');
INSERT INTO departments (college_code, code, name) VALUES ('CICS', 'DCS', 'Department of Computing Sciences');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Computer Science');
INSERT INTO departments (college_code, code, name) VALUES ('CICS', 'DIS', 'Department of Information Sciences');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Information Systems');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Information Technology (Database Systems)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Information Technology (Network Systems)');

INSERT INTO colleges (code, name) VALUES ('COL', 'College of Law');
INSERT INTO departments (college_code, code, name) VALUES ('COL', 'L', 'Law Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor (General Santos)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor (Iligan)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor Remolac');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor Remolac (General Santos)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor Remolac (Iligan)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor Remolac (Maguindanao)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor Remolac (Sulu)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Juris Doctor Remolac (Tawi-Tawi)');

INSERT INTO colleges (code, name) VALUES ('COM', 'College of Medicine');
INSERT INTO departments (college_code, code, name) VALUES ('COM', 'M', 'Medicine Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Doctor of Medicine');

INSERT INTO colleges (code, name) VALUES ('CNSM', 'College of Natural Sciences and Mathematics');
INSERT INTO departments (college_code, code, name) VALUES ('CNSM', 'B', 'Biology Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Biology (Animal Biology)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Biology');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D. in Biology (Academic Track)');
INSERT INTO departments (college_code, code, name) VALUES ('CNSM', 'C', 'Chemistry Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Chemistry');
INSERT INTO departments (college_code, code, name) VALUES ('CNSM', 'M', 'Mathematics Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Mathematics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Statistics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Certificate in Statistics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Doctor of Philosophy in Mathematics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Mathematics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MST High School Mathematics');
INSERT INTO departments (college_code, code, name) VALUES ('CNSM', 'P', 'Physics Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Physics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Doctor of Philosophy in Physics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Physics');

INSERT INTO colleges (code, name) VALUES ('CPA', 'College of Public Affairs');
INSERT INTO departments (college_code, code, name) VALUES ('CPA', 'CD', 'Community Development Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Sustainable Community Development');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Community Development');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Community Development (Plan A)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Community Development (Plan B)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSSCD major in Community Peace and Gender Justice(Academic Track)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSSCD major in Community Planning and Administration(Academic Track)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSSCD major in Community Planning and Administration(Professional Track)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSSCD major in Community Transformation(Academic Track)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSSCD major in Community Transformation(Professional Track)');
INSERT INTO departments (college_code, code, name) VALUES ('CPA', 'PA', 'Public Administration Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Bachelor of Public Administration');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Doctor in Public Administration');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Academic Track (Human Resource Management and Development)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Academic Track (Local and Regional Government Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Academic Track (Organization and Management Studies)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Academic Track (Public Fiscal Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan A (Human Resource Management)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan A (Local & Regional Government Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan A (Organization & Management)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan A (Public Fiscal Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan A (Public Policy & Program Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan B (Human Resource Management)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan B (Local & Regional Government Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan B (Organization & Management)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Plan B (Public Fiscal Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Professional Track (Human Resource Management and Development)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Professional Track (Local and Regional Government Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Professional Track (Organization and Management Studies)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Professional Track (Public Fiscal Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MPA Professional Track (Public Policy and Program Administration)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Public Administration (Plan A)');
INSERT INTO departments (college_code, code, name) VALUES ('CPA', 'SW', 'Social Work Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Social Work');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Social Work');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Science in Social Work');

INSERT INTO colleges (code, name) VALUES ('CSSH', 'College of Social Sciences and Humanities');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'CMS', 'Communication & Media Studies Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'AB Communication Studies major in Devt. Com.');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'AB Communication Studies major in Journalism');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Communication Studies (Media Education)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Journalism');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Development Communication');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'E', 'English Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA English Language Studies');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Literary and Cultural Studies');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA English Language Teaching');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'F', 'Filipino Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Filipino');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Panitikan');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Doktor ng Pilosopiya sa Panitikan');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Filipino major in Linggwistika');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Filipino major in Literatura');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master ng Sining sa Filipino (Panitikan)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master ng Sining sa Filipino (Wika)');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'G-CSSH', 'Graduate (CSSH)');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Global Studies major in American Studies Plan A');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Language Studies');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Peace and Development Studies');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Peace and Development Studies (MAPDS)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Philippine Studies');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA in Philippine Studies (Mindanao History, Society and Culture)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master in Peace and Development Studies (MPDS)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D in Language Studies (2025 Curriculum)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D. Language Studies');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D. Philippine Studies');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'H', 'History Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA History International History Track');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA History Philippine and Asian History Track');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA History Public History/Development Track');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA History');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'LIS', 'Library & Information Science Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Bachelor of Library and Information Science');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'P', 'Philosophy Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Philosophy');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'PS', 'Political Science Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Political Science');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'P2', 'Psychology Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Psychology');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Psychology');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Psychology');
INSERT INTO departments (college_code, code, name) VALUES ('CSSH', 'S', 'Sociology Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BA Sociology');

INSERT INTO colleges (code, name) VALUES ('CSPEAR', 'College of Sports, Physical Education and Recreation');
INSERT INTO departments (college_code, code, name) VALUES ('CSPEAR', 'PS', 'Professional Studies Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Physical Education');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MS Physical Education');

INSERT INTO colleges (code, name) VALUES ('DET', 'Division of Engineering Technology');
INSERT INTO departments (college_code, code, name) VALUES ('DET', 'G-DET', 'Graduate (Division of Engineering Technology)');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSIET Construction Engineering');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSIET Electrical and Renewable Energy');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSIET Materials Science');
INSERT INTO departments (college_code, code, name) VALUES ('DET', 'M', 'Metal Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSET Electrical and Renewable Energy');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSET Machining and Fabrication');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'DT Machine Shop Technology');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Diploma in Electrical Technology major in Renewable Energy');
INSERT INTO departments (college_code, code, name) VALUES ('DET', 'W', 'Wood Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BSET Construction Engineering Management');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Diploma in Technology Major in Construction Technology');

INSERT INTO colleges (code, name) VALUES ('ISED', 'Institute of Science Education');
INSERT INTO departments (college_code, code, name) VALUES ('ISED', 'G-ISED', 'Graduate (ISED)');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MST Elementary Science');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MST General Science');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MSciEd Secondary Mathematics');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D. Science Education (Biology)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Ph.D. Science Education (Mathematics)');

INSERT INTO colleges (code, name) VALUES ('KFCIAAS', 'King Faisal Center for Islamic, Arabic and Asian Studies');
INSERT INTO departments (college_code, code, name) VALUES ('KFCIAAS', 'G-KFCIAAS', 'Graduate (KFCIAAS)');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Islamic Law (For IS Graduate)');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'Master of Islamic Law (for Non-IS graduates)');
INSERT INTO departments (college_code, code, name) VALUES ('KFCIAAS', 'IR', 'International Relations Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS International Relations');
INSERT INTO departments (college_code, code, name) VALUES ('KFCIAAS', 'IBF', 'Islamic Banking and Finance Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Islamic Banking and Finance');
INSERT INTO departments (college_code, code, name) VALUES ('KFCIAAS', 'IS', 'Islamic Studies Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'AB Islamic Studies major in Shariah');
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'MA Islamic Studies (Muslim Law)');
INSERT INTO departments (college_code, code, name) VALUES ('KFCIAAS', 'TA', 'Teaching Arabic Department');
SET @dept_id := LAST_INSERT_ID();
INSERT INTO courses (department_id, name) VALUES (@dept_id, 'BS Teaching Arabic');

