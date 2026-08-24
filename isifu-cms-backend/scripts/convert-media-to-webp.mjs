import { existsSync, readFileSync } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { isAbsolute, join, parse } from 'node:path';

function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function replaceDeep(value, from, to) {
  if (typeof value === 'string') return value.includes(from) ? value.replaceAll(from, to) : value;
  if (Array.isArray(value)) return value.map((item) => replaceDeep(item, from, to));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceDeep(item, from, to)]));
  }
  return value;
}

function changed(a, b) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

function webpFilename(filename) {
  const parsed = parse(filename);
  return `${parsed.name}.webp`;
}

function extension(filename) {
  return parse(filename).ext.toLowerCase().replace(/^\./, '');
}

const WEBP_CONVERTIBLE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/avif', 'image/tiff']);
const WEBP_CONVERTIBLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'avif', 'tif', 'tiff']);

loadEnv();

const { PrismaClient } = await import('@prisma/client');
const sharp = (await import('sharp')).default;
const prisma = new PrismaClient();

const uploadDirConfig = process.env.UPLOAD_DIR || './uploads';
const uploadDir = isAbsolute(uploadDirConfig) ? uploadDirConfig : join(process.cwd(), uploadDirConfig);
const apiPrefix = process.env.API_PREFIX || 'api';
const quality = Number(process.env.MEDIA_WEBP_QUALITY || 82);
const deleteOriginals = process.env.MEDIA_WEBP_DELETE_ORIGINALS === 'true';

await mkdir(uploadDir, { recursive: true });

let converted = 0;
let skippedWebp = 0;
let skippedUnsupported = 0;
let missing = 0;

try {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { id: 'asc' } });
  console.log(`Scanning ${assets.length} media assets in ${uploadDir}`);

  for (const asset of assets) {
    const ext = extension(asset.filename);
    if (asset.mimeType === 'image/webp' || ext === 'webp') {
      skippedWebp += 1;
      continue;
    }

    if (!WEBP_CONVERTIBLE_MIME_TYPES.has(asset.mimeType) && !WEBP_CONVERTIBLE_EXTENSIONS.has(ext)) {
      console.log(`Skipped media #${asset.id}: unsupported type ${asset.mimeType} (${asset.filename})`);
      skippedUnsupported += 1;
      continue;
    }

    const source = join(uploadDir, asset.filename);
    if (!existsSync(source)) {
      console.warn(`Missing file for media #${asset.id}: ${source}`);
      missing += 1;
      continue;
    }

    const nextFilename = webpFilename(asset.filename);
    const target = join(uploadDir, nextFilename);
    const oldUrl = asset.url;
    const nextUrl = `/${apiPrefix}/uploads/${nextFilename}`;

    if (!existsSync(target)) {
      await sharp(source)
        .rotate()
        .webp({ quality, effort: 5 })
        .toFile(target);
    }

    const output = await stat(target);

    await prisma.$transaction(async (tx) => {
      await tx.mediaAsset.update({
        where: { id: asset.id },
        data: {
          filename: nextFilename,
          mimeType: 'image/webp',
          size: output.size,
          url: nextUrl,
        },
      });

      const entries = await tx.contentEntry.findMany({ select: { id: true, data: true } });
      for (const entry of entries) {
        const nextData = replaceDeep(entry.data, oldUrl, nextUrl);
        if (changed(entry.data, nextData)) {
          await tx.contentEntry.update({ where: { id: entry.id }, data: { data: nextData } });
        }
      }

      const pages = await tx.page.findMany({ select: { id: true, blocks: true } });
      for (const page of pages) {
        const nextBlocks = replaceDeep(page.blocks, oldUrl, nextUrl);
        if (changed(page.blocks, nextBlocks)) {
          await tx.page.update({ where: { id: page.id }, data: { blocks: nextBlocks } });
        }
      }
    });

    if (deleteOriginals && source !== target) {
      await unlink(source).catch(() => undefined);
    }

    converted += 1;
    console.log(`Converted media #${asset.id}: ${asset.filename} -> ${nextFilename}`);
  }
} finally {
  await prisma.$disconnect();
}

console.log(`WebP media conversion complete. Converted: ${converted}, already WebP: ${skippedWebp}, unsupported: ${skippedUnsupported}, missing: ${missing}.`);
