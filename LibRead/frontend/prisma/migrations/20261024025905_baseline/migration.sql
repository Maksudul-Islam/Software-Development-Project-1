-- CreateTable
CREATE TABLE `batches` (
    `batch_id` INTEGER NOT NULL AUTO_INCREMENT,
    `department` ENUM('CSE', 'EEE', 'English', 'Law', 'BBA', 'Economics', 'Political Science') NOT NULL,
    `batch_number` INTEGER NOT NULL,
    `current_semester` INTEGER NOT NULL,

    UNIQUE INDEX `unique_dept_batch`(`department`, `batch_number`),
    PRIMARY KEY (`batch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('Guest', 'General_User', 'Student', 'CR', 'Teacher', 'Admin') NOT NULL,
    `student_id` VARCHAR(20) NULL,
    `batch_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_student_id_key`(`student_id`),
    INDEX `users_batch_id_fkey`(`batch_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `course_id` INTEGER NOT NULL AUTO_INCREMENT,
    `course_code` VARCHAR(20) NOT NULL,
    `course_name` VARCHAR(150) NOT NULL,
    `course_type` ENUM('Theory', 'Lab') NOT NULL,
    `semester` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `teacher_id` INTEGER NULL,

    INDEX `courses_batch_id_fkey`(`batch_id`),
    INDEX `courses_teacher_id_fkey`(`teacher_id`),
    PRIMARY KEY (`course_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resources` (
    `resource_id` INTEGER NOT NULL AUTO_INCREMENT,
    `course_id` INTEGER NOT NULL,
    `uploader_id` INTEGER NOT NULL,
    `resource_type` ENUM('PDF', 'Image', 'Link', 'Video') NOT NULL,
    `file_or_link_path` TEXT NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('Pending', 'Approved') NOT NULL DEFAULT 'Pending',
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resources_course_id_fkey`(`course_id`),
    INDEX `resources_uploader_id_fkey`(`uploader_id`),
    PRIMARY KEY (`resource_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coordinators` (
    `coordinator_id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacher_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,

    INDEX `coordinators_batch_id_fkey`(`batch_id`),
    INDEX `coordinators_teacher_id_fkey`(`teacher_id`),
    PRIMARY KEY (`coordinator_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `books` (
    `book_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `author` VARCHAR(100) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `pdf_file_path` VARCHAR(255) NOT NULL,
    `is_downloadable` BOOLEAN NOT NULL DEFAULT false,
    `uploader_id` INTEGER NULL,

    INDEX `books_uploader_id_fkey`(`uploader_id`),
    PRIMARY KEY (`book_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resources` ADD CONSTRAINT `resources_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`course_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resources` ADD CONSTRAINT `resources_uploader_id_fkey` FOREIGN KEY (`uploader_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coordinators` ADD CONSTRAINT `coordinators_teacher_id_fkey` FOREIGN KEY (`teacher_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coordinators` ADD CONSTRAINT `coordinators_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `books` ADD CONSTRAINT `books_uploader_id_fkey` FOREIGN KEY (`uploader_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
