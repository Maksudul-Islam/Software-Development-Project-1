# LibRead — Digital Library & Academic Resource Sharing Portal

LibRead is a responsive web application designed for **Brahmaputra International University (BrIU)**. It combines a General Digital Library with an Academic Resource Sharing Portal.

The project aims to provide a centralized platform for reading digital books, sharing academic materials, organizing courses and semesters, and managing academic resources through role-based permissions.

> **Documentation status:** This document combines the original project blueprint, decisions made during development, and currently reported implementation progress. The original database design is provisional. The actual Prisma schema and database must be audited before finalizing the data model.

---

## 1. Project Objectives

- Build a responsive digital library for desktop and mobile browsers.
- Provide an academic resource-sharing platform organized by department, batch, semester, and course.
- Support authenticated sessions and role-based access control.
- Allow students to contribute academic resources through an approval workflow.
- Provide an in-browser PDF reader and configurable download permissions.
- Support academic administration, CR assignments, course-teacher assignments, semester promotion, and historical archives.

## 2. Technology Stack

| Component | Technology / Status |
|---|---|
| Frontend | Next.js / React / TypeScript — verify installed versions |
| UI foundation | Initially generated using v0.dev and subsequently customized |
| Development environment | VS Code with Antigravity extension |
| Database | MySQL |
| ORM | Prisma |
| Password verification | bcrypt |
| Session authentication | HMAC-SHA256 signed session token in an HTTP-only cookie |
| File storage | Not finalized; persistent local or object storage options require evaluation |
| Deployment | Not finalized |

The technology versions and exact project configuration should be verified from the repository before publishing installation instructions.

## 3. User Roles and Permissions

The following is the current planned role model. The detailed permission matrix must be verified against the backend implementation before these permissions are considered active.

### System Admin
- Manages system-wide configuration and user administration.
- Assigns or changes Department Heads.
- Has system-level administrative permissions.
- Participates in initial setup and authorized academic administration.

### Department Head
- Manages the assigned department within the permissions granted by the system.
- Can arrange Coordinator assignments within the permitted department scope.
- Can also work as a Teacher for assigned courses.
- May additionally serve as a Coordinator if separately assigned.

### Course / Batch Coordinator
- Manages only specifically assigned batches.
- Assigns or replaces CRs for assigned batches.
- Manages courses within the authorized scope.
- Handles assigned-batch resource moderation and notice boards.
- Manages semester promotion and previous-semester archiving.

### Course Teacher
- Reviews and approves academic resources for assigned courses.
- May be assigned to multiple courses.
- A course may have multiple Teachers, including practical/lab courses.

### Class Representative (CR)
- Reviews eligible academic resources belonging to the assigned batch.
- Cannot assign the CR role to themselves through ordinary registration.
- Is assigned or replaced by an authorized Admin or Coordinator.
- Multiple active CRs may be supported for one batch.

### Student
- Uses the General Library and the Academic Portal according to the final access policy.
- Accesses academic content according to batch and semester permissions.
- Can submit academic resources for review.

### General User
- Uses the General Library.
- Does not automatically receive access to restricted academic resources.

### Guest
- Can browse the permitted public library content.
- May read or download free books according to applicable permissions.
- Does not receive full Academic Portal access.

### Multiple responsibilities

A person may hold multiple responsibilities, such as Department Head and Teacher. Coordinator responsibilities must be assigned explicitly.

The database design should therefore be evaluated for a role-assignment model rather than assuming that one role field alone can represent every responsibility.

## 4. General Digital Library

### Planned features
- Book catalog, search, categories, and book details.
- In-browser PDF reader.
- Download permission controlled by the book's `is_downloadable` setting.
- Book metadata management for authorized staff.
- Book suggestions submitted by users.
- Book suggestions may include metadata only or metadata plus a PDF.
- Review and approval before submitted books are published.
- Optional library features such as bookmarks, ratings, and comments.

### Download enforcement

The backend must enforce download permissions. Hiding the Download button in the frontend is not sufficient.

Reading a PDF in the browser and downloading its original file are separate behaviors. The implementation must ensure that restricted files cannot be downloaded through an unprotected direct URL.

### File storage

The intended design is to store file metadata and storage references in the database while storing actual PDF files in suitable file/object storage.

The storage provider, deployment persistence, upload limits, and file-access security still need to be finalized.

## 5. Academic Resource Sharing Portal

### Academic organization
- Department
- Batch
- Semester
- Course
- Theory and Lab course types

Students should be routed to the appropriate academic area using their database-backed profile and batch information.

Courses and resources should be displayed using actual database records. Fake demonstration course codes must not be presented as real university course data.

### Resource types
- PDF
- Image
- Video
- External link

### Resource submission and approval workflow

1. A student submits an academic resource.
2. The resource is saved with a Pending status.
3. Ordinary students cannot access pending resources.
4. An authorized CR or the Teacher assigned to the relevant course may review it.
5. One authorized approval is sufficient to publish the resource.
6. Rejected resources remain unpublished; a rejection reason should be supported.
7. The system records the reviewer, review time, and decision.

Coordinators can moderate resources within their assigned batch scope. Department Head permissions must be explicitly configured rather than assumed to include unrestricted resource approval.

All review permissions must be enforced by backend authorization.

## 6. Registration and Batch Selection

The planned registration flow includes relevant profile information such as:
- Name
- Email
- Student ID, where applicable
- Department
- Batch

The final registration fields and validation rules must match the actual database design.

Important rules:
- Department options must match supported university departments.
- Do not add a department only in the frontend without an intentional database change.
- Batch options should be fetched dynamically from the database.
- Use `batch_id` as the batch identity rather than relying on `batch_number` alone.
- Use the database's current semester information when determining the student's academic destination.
- Enforce academic access restrictions on the backend.

## 7. Courses and Teacher Assignments

- Courses belong to the appropriate academic batch and semester according to the final data model.
- Course code, name, semester, and course type should come from the database.
- Theory and Lab courses must be distinguishable.
- Teachers may be assigned to multiple courses.
- A course may have multiple assigned Teachers.
- Teacher approval rights are limited to their assigned courses.

The original schema proposal included a single `teacher_id` field on a course. This may not support multiple Teachers per course and must be reviewed before implementation.

## 8. Semester Promotion and Archiving

An authorized Coordinator or Admin should be able to promote an assigned batch to its next semester.

The intended process includes:
1. Validating the current batch and semester.
2. Updating the batch's current semester.
3. Configuring the new semester's courses and academic structure.
4. Preserving historical course and resource records.
5. Making previous-semester content read-only where required.
6. Avoiding duplicate course records and accidental data loss.

The exact promotion process and archive model must be designed against the actual schema. Multi-step database changes should use appropriate transaction and consistency safeguards.

## 9. Authentication and Current Implementation Status

The following authentication work has been reported as implemented and tested.

| Area | Reported status |
|---|---|
| Database-backed login | Implemented and tested |
| bcrypt password comparison | Implemented |
| Signed session cookie | Implemented |
| Current-user API | Implemented |
| Logout API | Implemented |
| Login form API integration | Implemented |
| Session restoration after refresh | Tested successfully |
| Invalid credentials rejection | Tested successfully |
| Current-user API returns 401 after logout | Tested successfully |
| TypeScript/build/development checks | Previously tested |

Previously updated files include:

- `frontend/lib/auth.ts`
- `frontend/app/api/auth/login/route.ts`
- `frontend/app/api/auth/me/route.ts`
- `frontend/app/api/auth/logout/route.ts`
- The registration API route
- `frontend/app/page.tsx`
- `next.config.mjs`

These results describe previously reported tests, not a guarantee that every test currently passes. Re-run relevant tests after changing authentication or related database models.

**Preservation requirement:** Avoid unnecessary changes to the working authentication flow while developing the library and academic portal.

## 10. Original Database Blueprint — Provisional

The initial project proposal described the following entities. They are a conceptual starting point, not a verified description of the current database.

### Batches
Initially proposed fields:
- `batch_id`
- `department`
- `batch_number`
- `current_semester`

### Users
Initially proposed fields:
- `user_id`
- `name`
- `email`
- `password`
- `role`
- `student_id`
- `batch_id`

### Courses
Initially proposed fields:
- `course_id`
- `course_code`
- `course_name`
- `course_type`
- `semester`
- `batch_id`
- `teacher_id`

### Academic Resources
Initially proposed fields:
- `resource_id`
- `course_id`
- `uploader_id`
- `resource_type`
- `file_or_link_path`
- `description`
- `status`

### Coordinators
Initially proposed fields:
- `coordinator_id`
- `teacher_id`
- `batch_id`

### Library Books
Initially proposed fields:
- `book_id`
- `title`
- `author`
- `category`
- `pdf_file_path`
- `is_downloadable`
- `uploader_id`

### Schema audit required

Before adopting or changing this design, inspect:
- The current `schema.prisma`.
- Existing Prisma migrations.
- Actual MySQL tables, columns, indexes, and constraints.
- Existing user, batch, course, and resource data.
- Current relations and deletion behavior.
- Support for multiple Teachers per course.
- Department Head, Coordinator, and CR assignments.
- Resource review history and book-submission approval.
- File storage and access-control requirements.

Do not reset the database or replace the existing schema simply because the initial blueprint is incomplete.

## 11. Development Environment and Safety

Development currently uses VS Code with the Antigravity extension for AI-assisted coding.

Before implementing a substantial change:
1. Inspect the relevant existing files.
2. Identify the current behavior and dependencies.
3. Explain the proposed change and its risks.
4. Preserve existing working features.
5. Review schema and migration impact before database changes.
6. Implement a focused change.
7. Test the affected flows and report actual results.

Never claim a feature is implemented or tested unless there is evidence from the repository or an actual test result.

## 12. Current Priorities

The next work should proceed in this order:

1. Inspect the current repository structure and package configuration.
2. Audit the existing Prisma schema and database without destructive changes.
3. Compare the actual implementation with this project blueprint and the more recent role/permission decisions.
4. Identify missing relations and required model changes.
5. Finalize the role and permission matrix.
6. Update the schema plan and project documentation.
7. Implement the General Library and Academic Portal features incrementally.
8. Test authentication, access control, uploads, approvals, and semester transitions.

### Known outstanding items

- Confirm the current database schema and migrations.
- Confirm whether the role model supports all agreed responsibilities.
- Determine how multiple Teachers are assigned to a course.
- Finalize Department Head and Coordinator assignment permissions.
- Audit the current status of the Pending Approvals Queue UI.
- Implement and test book catalog, PDF reader, and secure download controls.
- Implement and test the academic resource upload and moderation workflow.
- Finalize semester promotion and archive behavior.
- Finalize file storage and deployment strategy.

---

**Document maintenance:** Update this README when major features, architecture, setup instructions, or permissions change. Keep a separate progress/handover document for detailed session history and next actions.
