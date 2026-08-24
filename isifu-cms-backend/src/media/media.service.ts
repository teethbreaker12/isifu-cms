import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { stat, unlink } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaFolderDto, UpdateMediaAssetDto, UpdateMediaAssetFolderDto, UpdateMediaFolderDto, UploadMediaDto } from './dto';

const WEBP_CONVERTIBLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/avif', 'image/tiff']);

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findFolders() {
    return this.prisma.mediaFolder.findMany({ orderBy: { name: 'asc' } });
  }

  async create(file: Express.Multer.File, dto: UploadMediaDto = {}) {
    const apiPrefix = this.config.get<string>('API_PREFIX', 'api');
    const uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    const storedFile = await this.optimizeUpload(file, uploadDir);
    if (dto.folderId) await this.ensureFolderExists(dto.folderId);
    return this.prisma.mediaAsset.create({
      data: {
        filename: storedFile.filename,
        originalName: file.originalname,
        displayName: file.originalname,
        mimeType: storedFile.mimeType,
        size: storedFile.size,
        url: `/${apiPrefix}/uploads/${storedFile.filename}`,
        folderId: dto.folderId,
      },
    });
  }

  async updateFolder(id: number, dto: UpdateMediaAssetFolderDto) {
    if (dto.folderId) await this.ensureFolderExists(dto.folderId);
    return this.prisma.mediaAsset.update({
      where: { id },
      data: { folderId: dto.folderId ?? null },
    });
  }

  updateAsset(id: number, dto: UpdateMediaAssetDto) {
    return this.prisma.mediaAsset.update({
      where: { id },
      data: { displayName: dto.displayName?.trim() || null },
    });
  }

  async remove(id: number) {
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({ where: { id } });
    const uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    await unlink(join(process.cwd(), uploadDir, asset.filename)).catch(() => undefined);
    return this.prisma.mediaAsset.delete({ where: { id } });
  }

  createFolder(dto: CreateMediaFolderDto) {
    const name = this.normalizeFolderName(dto.name);
    return this.prisma.mediaFolder.create({ data: { name } });
  }

  updateMediaFolder(id: number, dto: UpdateMediaFolderDto) {
    const name = this.normalizeFolderName(dto.name);
    return this.prisma.mediaFolder.update({ where: { id }, data: { name } });
  }

  removeFolder(id: number) {
    return this.prisma.mediaFolder.delete({ where: { id } });
  }

  private normalizeFolderName(name: string) {
    const normalized = name.trim();
    if (!normalized) throw new BadRequestException('Folder name cannot be empty');
    return normalized;
  }

  private async ensureFolderExists(id: number) {
    const folder = await this.prisma.mediaFolder.findUnique({ where: { id } });
    if (!folder) throw new BadRequestException('Folder does not exist');
  }

  private async optimizeUpload(file: Express.Multer.File, uploadDir: string) {
    if (!WEBP_CONVERTIBLE_MIME_TYPES.has(file.mimetype)) {
      return { filename: file.filename, mimeType: file.mimetype, size: file.size };
    }

    const source = join(process.cwd(), uploadDir, file.filename);
    const targetName = `${parse(file.filename).name}.webp`;
    const target = join(process.cwd(), uploadDir, targetName);
    const quality = Math.min(100, Math.max(1, Number(this.config.get<string>('MEDIA_WEBP_QUALITY', '82')) || 82));

    try {
      await sharp(source)
        .rotate()
        .webp({ quality, effort: 5 })
        .toFile(target);
      await unlink(source).catch(() => undefined);
      const output = await stat(target);
      return { filename: targetName, mimeType: 'image/webp', size: output.size };
    } catch {
      return { filename: file.filename, mimeType: file.mimetype, size: file.size };
    }
  }
}
