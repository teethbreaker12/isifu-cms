import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMediaFolderDto, UpdateMediaAssetFolderDto, UpdateMediaFolderDto, UploadMediaDto } from './dto';

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
    if (dto.folderId) await this.ensureFolderExists(dto.folderId);
    return this.prisma.mediaAsset.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/${apiPrefix}/uploads/${file.filename}`,
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
}
