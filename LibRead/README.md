# LibRead — Project Blueprint & Architecture

LibRead is a responsive web application designed as a dual-purpose platform. It serves as a general E-Library and an Academic Resource Sharing Portal tailored specifically for the **Brahmaputra International University (BrIU)**. The platform is fully optimized for both desktop and mobile browsers.

---

##  1. User Roles & Permissions Matrix

The system architecture defines 5 distinct user roles with the following access and modification privileges:

| User Role | General Library Access | Academic Portal Access | File Upload Capabilities | Moderation / Approval Rights |
| :--- | :--- | :--- | :--- | :--- |
| **1. Guest User** |  Read/Download free books only |  Access Denied |  No upload rights |  None |
| **2. BrIU Student** |  Full access (Bookmarks, Ratings, Comments) |  Restricted to own Batch & Semester only |  Class notes, Images, and Links |  None (Uploads remain *Pending*) |
| **3. Class Representative (CR)** |  Full access |  Restricted to own Batch & Semester |  Direct upload (Notes, Materials, Notices) |  Can approve files from own batch students |
| **4. Course Teacher** |  Full access |  Read-only access across all batches |  Restricted to assigned courses only |  Can approve files within assigned courses |
| **5. Course Coordinator** |  Full access |  Full management of assigned batches |  Upload to any course & Batch Notice Board |  Full batch moderation & Semester Promotion |
| **6. Super Admin** |  Full Control |  Full Control |  System-wide upload rights |  Department/Course creation & User management |

---

##  2. Core Features & Backend Mechanisms

### Feature 1: Guest Mode & Central Dashboard Switching
*   **Mechanism:** Unauthenticated users can browse the homepage and read/download free tier books. Advanced interactions prompt a login modal.
*   **Dashboard Switching:** Post-authentication, the top navigation bar displays two distinct tabs: `[ General Library]` and `[ BrIU Academic Portal]`, enabling seamless one-click toggling between environments.

### Feature 2: Personalized Registration & Automated Direction
*   **Mechanism:** During signup, BrIU students select their *Name, Email, Student ID, Department (e.g., CSE/EEE),* and *Batch (e.g., 14th)*.
*   **Auto-Direction:** This profile data is persisted in the database. Upon accessing the Academic Portal, the backend bypasses manual searches, evaluating the user's profile to route them directly to their current semester page (e.g., `CSE -> 14th Batch`). Access to other batch pages remains structurally locked.

### Feature 3: Dynamic Download Permission System
*   **Mechanism:** The `books` schema contains a boolean flag: `is_downloadable` (True/False).
*   **Condition:** If set to `True` by an administrator, the UI renders the "Download" button. If `False`, the button is conditionally hidden, forcing the user to view the file via an embedded **In-App PDF Reader**.

### Feature 4: Semi-Automatic Semester Promotion
*   **Mechanism:** Upon semester completion, a Course Coordinator or Admin triggers the **"Promote Batch"** pipeline via the management panel.
*   **Execution:** The backend atomically updates the batch's current semester counter (e.g., 1st Semester  2nd Semester) and provisions the required folder structures and course records for the new semester. 
*   **Archiving:** Legacy semester data is safely preserved and migrated to a **"Past Semesters" Archive**, rendering it read-only for historical reference.

### Feature 5: Structural Segregation (Departments, Courses, & Labs)
*   **Mechanism:** Each semester contains isolated course modules (e.g., `CSE-111`, `EEE-121`). 
*   **Lab Differentiation:** Theory courses are strictly segregated from practical modules. Dedicated Lab folders (e.g., `CSE-112 [LAB]`) are provisioned exclusively to accept lab reports, source code files, or experimental documentation/media.

### Feature 6: Crowd-Sourced Materials & Moderation Workflow
*   **Mechanism:** General students can contribute crowdsourced assets, including handwritten lecture notes (images), PDFs, or external URLs (Google Drive/YouTube).
*   **State Machine:** Upon upload, the asset is initialized with a status constraint of `status = 'pending'`. 
*   **Moderation Pipeline:** A webhook or state trigger dispatches a notification to the respective CR, assigned Teacher, or Coordinator. Upon manual validation, clicking "Approve" transitions the asset state to `status = 'approved'`, rendering it globally visible to the class.

---

##  3. Database Schema Overview (Entity Relations)

To support the business logic, the relational database will structure data across the following core entities:

1.  **Users Table:** `id`, `name`, `email`, `password`, `role` *(Student/Teacher/Coordinator/Admin)*, `department`, `batch`.
2.  **Books Table:** `book_id`, `title`, `author`, `category`, `pdf_file_path`, `is_downloadable` *(Boolean)*.
3.  **Batches Table:** `batch_id`, `department_name`, `batch_number` *(e.g., 14th)*, `current_semester`.
4.  **Courses Table:** `course_code`, `course_name`, `type` *(Theory/Lab)*, `batch_id`, `assigned_teacher_id`.
5.  **Resources Table:** `resource_id`, `course_id`, `uploader_id` *(User ID)*, `file_type` *(Image/PDF/Link)*, `status` *(Pending/Approved)*.
