import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(role: Role) {
    const [entries, pages, media] = await Promise.all([
      this.prisma.contentEntry.count(),
      this.prisma.page.count(),
      this.prisma.mediaAsset.count(),
    ]);

    if (role === Role.EDITOR) {
      return { entries, pages, media };
    }

    const [models, users] = await Promise.all([
      this.prisma.contentType.count(),
      this.prisma.user.count(),
    ]);

    return { models, entries, pages, media, users };
  }
}
