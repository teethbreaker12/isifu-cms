-- Enforce unique non-null slugs per content model.
CREATE UNIQUE INDEX `ContentEntry_contentTypeId_slug_key` ON `ContentEntry`(`contentTypeId`, `slug`);
DROP INDEX `ContentEntry_contentTypeId_slug_idx` ON `ContentEntry`;
