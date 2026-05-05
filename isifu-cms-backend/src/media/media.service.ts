import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(file: Express.Multer.File) {
    const apiPrefix = this.config.get<string>('API_PREFIX', 'api');
    return this.prisma.mediaAsset.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/${apiPrefix}/uploads/${file.filename}`,
      },
    });
  }

  async remove(id: number) {
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({ where: { id } });
    const uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads');
    await unlink(join(process.cwd(), uploadDir, asset.filename)).catch(() => undefined);
    return this.prisma.mediaAsset.delete({ where: { id } });
  }
}
