# LibRead — Database Schema & Architecture

This document contains the complete relational database schema design for the **LibRead** application. The database is architected to optimize user role isolation, batch-based dynamic routing, and structured moderation pipelines.

---

## Complete DDL & Table Structure

### 1. Batches Table (`batches`)
Manages university batches for dynamic semester progression and targeted resource visibility.
```sql
CREATE TABLE batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    department ENUM('CSE', 'EEE', 'English', 'Law', 'BBA', 'Economics') NOT NULL,
    batch_number INT NOT NULL, -- e.g., 14, 15
    current_semester INT NOT NULL, -- e.g., 1, 2 (Active semester tracker)
    UNIQUE KEY unique_dept_batch (department, batch_number) -- Prevents duplicate batch entries per department
);
```

### 2. Users Table (`users`)
Stores user profiles and core authentication credentials mapped to institutional identifiers.
```sql
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Guest', 'General_User', 'Student', 'CR', 'Teacher', 'Admin') NOT NULL,
    student_id VARCHAR(20) UNIQUE NULL, -- Applicable for BrIU students only
    batch_id INT NULL, -- Direct relation to batches table for automated routing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE SET NULL
);
```

### 3. Courses Table (`courses`)
Tracks academic modules assigned to explicit batches and instructors.
```sql
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL, -- e.g., CSE-111
    course_name VARCHAR(150) NOT NULL,
    course_type ENUM('Theory', 'Lab') NOT NULL,
    semester INT NOT NULL, -- Identifies which semester this course belongs to
    batch_id INT NOT NULL, -- Identifies which batch is currently taking this course
    teacher_id INT NULL, -- Assigned instructor
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE SET NULL
);
```

### 4. Academic Resources Table (`resources`)
Handles student and CR-contributed crowdsourced learning materials with built-in state constraints for moderation.
```sql
CREATE TABLE resources (
    resource_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL, -- Automatically resolves Batch and Department layers
    uploader_id INT NOT NULL,
    resource_type ENUM('PDF', 'Image', 'Link', 'Video') NOT NULL,
    file_or_link_path TEXT NOT NULL,
    description TEXT,
    status ENUM('Pending', 'Approved') DEFAULT 'Pending', -- Core moderation hook
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### 5. Course Coordinators Table (`coordinators`)
Decouples administrative roles from base faculty profiles, establishing granular control over specific batch promotions and moderation rights.
```sql
CREATE TABLE coordinators (
    coordinator_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL, -- Points to a user with the 'Teacher' role
    batch_id INT NOT NULL, -- Assigned batch under their administration
    FOREIGN KEY (teacher_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
);
```

### 6. Library Books Table (`books`)
Handles global catalogs within the centralized E-Library environment.
```sql
CREATE TABLE books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    pdf_file_path VARCHAR(255) NOT NULL,
    is_downloadable BOOLEAN DEFAULT FALSE, -- Toggles UI download vs In-App Reader visibility
    uploader_id INT,
    FOREIGN KEY (uploader_id) REFERENCES users(user_id) ON DELETE SET NULL
);
```
