import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(role: Role) {
    const [entries, pages, media, forms] = await Promise.all([
      this.prisma.contentEntry.count(),
      this.prisma.page.count(),
      this.prisma.mediaAsset.count(),
      this.prisma.form.count(),
    ]);

    if (role === Role.EDITOR) {
      return { entries, pages, media, forms };
    }

    const [models, users] = await Promise.all([
      this.prisma.contentType.count(),
      this.prisma.user.count(),
    ]);

    return { models, entries, pages, media, forms, users };
  }
}
