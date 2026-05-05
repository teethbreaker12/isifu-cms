import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertPageDto } from './dto';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(publishedOnly = false) {
    return this.prisma.page.findMany({
      where: publishedOnly ? { published: true } : {},
      include: { contentType: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(slug: string, publishedOnly = false) {
    const page = await this.prisma.page.findFirst({
      where: { slug, ...(publishedOnly ? { published: true } : {}) },
      include: { contentType: true },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  create(dto: UpsertPageDto) {
    return this.prisma.page.create({ data: { ...dto, blocks: dto.blocks as Prisma.InputJsonValue } });
  }

  update(slug: string, dto: UpsertPageDto, role: Role = Role.ADMIN) {
    if (role === Role.EDITOR) {
      return this.updateContentOnly(slug, dto);
    }
    return this.prisma.page.update({ where: { slug }, data: { ...dto, blocks: dto.blocks as Prisma.InputJsonValue } });
  }

  private async updateContentOnly(slug: string, dto: UpsertPageDto) {
    const existing = await this.findOne(slug);
    const existingBlocks = Array.isArray(existing.blocks) ? existing.blocks as Array<Record<string, unknown>> : [];
    const incomingBlocks = Array.isArray(dto.blocks) ? dto.blocks as Array<Record<string, unknown>> : [];
    const incomingById = new Map(incomingBlocks.map((block) => [String(block.id), block]));
    const contentKeys = new Set(['value', 'entryId', 'title']);

    const mergedBlocks = existingBlocks.map((block) => {
      const next = incomingById.get(String(block.id));
      if (!next) return block;
      const currentProps = typeof block.props === 'object' && block.props ? block.props as Record<string, unknown> : {};
      const nextProps = typeof next.props === 'object' && next.props ? next.props as Record<string, unknown> : {};
      const mergedProps = { ...currentProps };
      for (const key of contentKeys) {
        if (Object.prototype.hasOwnProperty.call(nextProps, key)) mergedProps[key] = nextProps[key];
      }
      return { ...block, props: mergedProps };
    });

    return this.prisma.page.update({
      where: { slug },
      data: {
        blocks: mergedBlocks as Prisma.InputJsonValue,
        published: dto.published,
      },
    });
  }

  remove(slug: string) {
    return this.prisma.page.delete({ where: { slug } });
  }
}
