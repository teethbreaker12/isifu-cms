CREATE TABLE `Form` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `recipientEmail` VARCHAR(191) NOT NULL,
  `notificationSubject` VARCHAR(191) NULL,
  `responderEnabled` BOOLEAN NOT NULL DEFAULT false,
  `responderEmailField` VARCHAR(191) NULL,
  `responderSubject` VARCHAR(191) NULL,
  `responderMessage` TEXT NULL,
  `successMessage` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Form_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FormField` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `formId` INTEGER NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `required` BOOLEAN NOT NULL DEFAULT false,
  `settings` JSON NULL,
  `order` INTEGER NOT NULL DEFAULT 0,

  UNIQUE INDEX `FormField_formId_key_key`(`formId`, `key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FormSubmission` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `formId` INTEGER NOT NULL,
  `data` JSON NOT NULL,
  `respondentEmail` VARCHAR(191) NULL,
  `notificationSent` BOOLEAN NOT NULL DEFAULT false,
  `responseSent` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `FormSubmission_formId_createdAt_idx`(`formId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FormField` ADD CONSTRAINT `FormField_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `Form`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FormSubmission` ADD CONSTRAINT `FormSubmission_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `Form`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
