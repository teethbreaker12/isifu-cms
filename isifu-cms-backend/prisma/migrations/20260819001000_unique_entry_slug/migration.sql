-- Enforce unique non-null slugs per content model.
DROP INDEX `ContentEntry_contentTypeId_slug_idx` ON `ContentEntry`;
CREATE UNIQUE INDEX `ContentEntry_contentTypeId_slug_key` ON `ContentEntry`(`contentTypeId`, `slug`);
