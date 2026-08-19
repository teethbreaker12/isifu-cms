ALTER TABLE `ContentType` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'draft';
UPDATE `ContentType` SET `status` = 'published';
