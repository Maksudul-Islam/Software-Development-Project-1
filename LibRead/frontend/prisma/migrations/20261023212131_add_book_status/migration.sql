-- AlterTable
ALTER TABLE `books` ADD COLUMN `status` ENUM('Draft', 'Pending', 'Published') NOT NULL DEFAULT 'Draft';
