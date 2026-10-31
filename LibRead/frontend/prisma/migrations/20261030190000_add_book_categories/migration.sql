-- LibRead validated category migration
-- Do not run this file against an already-migrated database.

-- Step 0: Validate legacy data before schema changes.
-- Reject invalid legacy category data before schema changes.
CREATE TEMPORARY TABLE `_category_migration_guard` (
    `problem_count` INT NOT NULL,
    CONSTRAINT `category_migration_guard_check` CHECK (`problem_count` = 0)
);

INSERT INTO `_category_migration_guard` (`problem_count`)
SELECT COUNT(*)
FROM (
    SELECT book_id
    FROM books
    WHERE category IS NULL OR TRIM(category) = ''

    UNION ALL

    SELECT book_id
    FROM books
    WHERE category IS NOT NULL
      AND CHAR_LENGTH(TRIM(category)) > 100

    UNION ALL

    SELECT MIN(book_id)
    FROM books
    WHERE category IS NOT NULL AND TRIM(category) <> ''
    GROUP BY LOWER(TRIM(category))
    HAVING COUNT(DISTINCT BINARY TRIM(category)) > 1
) AS problems;

DROP TEMPORARY TABLE `_category_migration_guard`;

-- Step 1: Create normalized category tables.
ALTER TABLE `books` ADD COLUMN `primary_main_category_id` INTEGER NULL;

CREATE TABLE `main_categories` (
    `main_category_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `normalized_name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `main_categories_normalized_name_key`(`normalized_name`),
    PRIMARY KEY (`main_category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `subcategories` (
    `subcategory_id` INTEGER NOT NULL AUTO_INCREMENT,
    `main_category_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `normalized_name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `unique_subcategory_parent`(`main_category_id`, `subcategory_id`),
    UNIQUE INDEX `unique_subcategory_name_per_main`(`main_category_id`, `normalized_name`),
    PRIMARY KEY (`subcategory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `book_main_categories` (
    `book_id` INTEGER NOT NULL,
    `main_category_id` INTEGER NOT NULL,

    INDEX `book_main_categories_main_category_id_idx`(`main_category_id`),
    PRIMARY KEY (`book_id`, `main_category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `book_subcategory_assignments` (
    `book_id` INTEGER NOT NULL,
    `main_category_id` INTEGER NOT NULL,
    `subcategory_id` INTEGER NOT NULL,

    INDEX `book_subcategory_assignments_subcategory_idx`(`main_category_id`, `subcategory_id`),
    PRIMARY KEY (`book_id`, `main_category_id`, `subcategory_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `books_primary_main_category_id_idx` ON `books`(`primary_main_category_id`);

ALTER TABLE `subcategories`
    ADD CONSTRAINT `subcategories_main_category_id_fkey`
    FOREIGN KEY (`main_category_id`)
    REFERENCES `main_categories`(`main_category_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `book_main_categories`
    ADD CONSTRAINT `book_main_categories_book_id_fkey`
    FOREIGN KEY (`book_id`)
    REFERENCES `books`(`book_id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `book_main_categories`
    ADD CONSTRAINT `book_main_categories_main_category_id_fkey`
    FOREIGN KEY (`main_category_id`)
    REFERENCES `main_categories`(`main_category_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `book_subcategory_assignments`
    ADD CONSTRAINT `book_subcategory_assignments_book_id_main_category_id_fkey`
    FOREIGN KEY (`book_id`, `main_category_id`)
    REFERENCES `book_main_categories`(`book_id`, `main_category_id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `book_subcategory_assignments`
    ADD CONSTRAINT `book_subcategory_assignments_main_category_id_subcategory_i_fkey`
    FOREIGN KEY (`main_category_id`, `subcategory_id`)
    REFERENCES `subcategories`(`main_category_id`, `subcategory_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `books`
    ADD CONSTRAINT `books_primary_main_category_id_fkey`
    FOREIGN KEY (`primary_main_category_id`)
    REFERENCES `main_categories`(`main_category_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 2: Backfill legacy categories.
START TRANSACTION;

INSERT INTO `main_categories` (`name`, `normalized_name`)
SELECT DISTINCT
    TRIM(`category`),
    LOWER(TRIM(`category`))
FROM `books`
WHERE `category` IS NOT NULL
  AND TRIM(`category`) <> ''
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`);

INSERT INTO `book_main_categories` (`book_id`, `main_category_id`)
SELECT
    b.`book_id`,
    mc.`main_category_id`
FROM `books` AS b
JOIN `main_categories` AS mc
  ON mc.`normalized_name` = LOWER(TRIM(b.`category`))
WHERE b.`category` IS NOT NULL
  AND TRIM(b.`category`) <> ''
ON DUPLICATE KEY UPDATE
    `main_category_id` = VALUES(`main_category_id`);

UPDATE `books` AS b
JOIN `main_categories` AS mc
  ON mc.`normalized_name` = LOWER(TRIM(b.`category`))
SET b.`primary_main_category_id` = mc.`main_category_id`
WHERE b.`category` IS NOT NULL
  AND TRIM(b.`category`) <> '';

COMMIT;

-- Step 3: Verify every book has a valid primary assignment.
CREATE TEMPORARY TABLE `_category_migration_guard` (
    `problem_count` INT NOT NULL,
    CONSTRAINT `category_migration_guard_check` CHECK (`problem_count` = 0)
);

INSERT INTO `_category_migration_guard` (`problem_count`)
SELECT
    (SELECT COUNT(*)
     FROM `books`
     WHERE `primary_main_category_id` IS NULL)
    +
    (SELECT COUNT(*)
     FROM `books` AS b
     LEFT JOIN `book_main_categories` AS bmc
       ON bmc.`book_id` = b.`book_id`
      AND bmc.`main_category_id` = b.`primary_main_category_id`
     WHERE bmc.`book_id` IS NULL);

DROP TEMPORARY TABLE `_category_migration_guard`;

-- Step 4: Enforce mandatory primary category.
ALTER TABLE `books` DROP FOREIGN KEY `books_primary_main_category_id_fkey`;

ALTER TABLE `books` MODIFY `primary_main_category_id` INTEGER NOT NULL;

ALTER TABLE `books`
    ADD CONSTRAINT `books_primary_main_category_id_fkey`
    FOREIGN KEY (`primary_main_category_id`)
    REFERENCES `main_categories`(`main_category_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
