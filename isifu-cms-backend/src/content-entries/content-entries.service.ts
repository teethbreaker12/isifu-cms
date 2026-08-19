import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';
import { normalizeFieldValue, parseSelectOptions } from '../common/field-types';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertEntryDto } from './dto';

@Injectable()
export class ContentEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(contentTypeKey: string, publishedOnly = false) {
    const contentType = await this.getContentType(contentTypeKey, publishedOnly);
    return this.prisma.contentEntry.findMany({
      where: { contentTypeId: contentType.id, ...(publishedOnly ? { status: 'published' } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(contentTypeKey: string, idOrSlug: string, publishedOnly = false) {
    const contentType = await this.getContentType(contentTypeKey, publishedOnly);
    const numericId = Number(idOrSlug);
    const entry = await this.prisma.contentEntry.findFirst({
      where: {
        contentTypeId: contentType.id,
        ...(Number.isInteger(numericId) ? { id: numericId } : { slug: idOrSlug }),
        ...(publishedOnly ? { status: 'published' } : {}),
      },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    return entry;
  }

  async create(contentTypeKey: string, dto: UpsertEntryDto) {
    const contentType = await this.getContentType(contentTypeKey);
    const data = this.normalizeData(contentType.fields, dto.data);
    const slug = this.entrySlug(dto.slug, data);
    await this.assertUniqueSlug(contentType.id, slug);
    const entry = await this.prisma.contentEntry.create({
      data: {
        contentTypeId: contentType.id,
        slug,
        status: dto.status ?? 'draft',
        data: data as Prisma.InputJsonObject,
      },
    });
    const dynamicRowId = await this.insertDynamicRow(contentType.tableName, entry.id, contentType.fields, data);
    return this.prisma.contentEntry.update({ where: { id: entry.id }, data: { dynamicRowId } });
  }

  async update(contentTypeKey: string, id: number, dto: UpsertEntryDto) {
    const contentType = await this.getContentType(contentTypeKey);
    const existing = await this.prisma.contentEntry.findFirst({ where: { id, contentTypeId: contentType.id } });
    if (!existing) throw new NotFoundException('Entry not found');
    const data = this.normalizeData(contentType.fields, dto.data);
    const slug = this.entrySlug(dto.slug, data);
    await this.assertUniqueSlug(contentType.id, slug, existing.id);

    await this.updateDynamicRow(contentType.tableName, existing.dynamicRowId, existing.id, contentType.fields, data);
    return this.prisma.contentEntry.update({
      where: { id },
      data: { slug, status: dto.status ?? existing.status, data: data as Prisma.InputJsonObject },
    });
  }

  async remove(contentTypeKey: string, id: number) {
    const contentType = await this.getContentType(contentTypeKey);
    const existing = await this.prisma.contentEntry.findFirst({ where: { id, contentTypeId: contentType.id } });
    if (!existing) throw new NotFoundException('Entry not found');
    if (existing.dynamicRowId) {
      await this.prisma.$executeRawUnsafe(`DELETE FROM \`${contentType.tableName}\` WHERE id = ?`, existing.dynamicRowId);
    }
    return this.prisma.contentEntry.delete({ where: { id } });
  }

  private async getContentType(key: string, publishedOnly = false) {
    const contentType = await this.prisma.contentType.findUnique({
      where: { key },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!contentType) throw new NotFoundException('Content type not found');
    if (publishedOnly && contentType.status !== 'published') throw new NotFoundException('Content type not found');
    return contentType;
  }

  private normalizeData(
    fields: { key: string; type: string; required: boolean; settings?: Prisma.JsonValue }[],
    data: Record<string, unknown>,
  ) {
    const output: Record<string, unknown> = {};
    const hasTitleField = fields.some((field) => field.key === 'title');
    for (const field of fields) {
      const value = normalizeFieldValue(field.type as never, data[field.key]);
      if (field.required && (value === null || value === undefined || value === '')) {
        throw new BadRequestException(`${field.key} is required`);
      }
      if (field.type === 'select' && typeof value === 'string') {
        const options = parseSelectOptions(field.settings as Record<string, unknown> | null | undefined);
        const optionValues = options.map((option) => option.value);
        if (optionValues.length > 0 && !optionValues.includes(value)) {
          throw new BadRequestException(`${field.key} must be one of: ${optionValues.join(', ')}`);
        }
      }
      output[field.key] = value;
    }
    if (!hasTitleField) {
      const title = normalizeFieldValue('text' as never, data.title);
      if (title === null || title === undefined || title === '') {
        throw new BadRequestException('title is required');
      }
      output.title = title;
    }
    return output;
  }

  private entrySlug(slug: string | undefined, data: Record<string, unknown>) {
    const manualSlug = slug?.trim();
    if (manualSlug) return manualSlug;
    const title = data.title;
    if (typeof title !== 'string' || !title.trim()) return undefined;
    return slugify(title, { lower: true, strict: true, locale: 'pl', trim: true }) || undefined;
  }

  private async assertUniqueSlug(contentTypeId: number, slug: string | undefined, excludeEntryId?: number) {
    if (!slug) return;
    const existing = await this.prisma.contentEntry.findFirst({
      where: {
        contentTypeId,
        slug,
        ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Slug already exists for this content type');
  }

  private async insertDynamicRow(tableName: string, entryId: number, fields: { key: string; type: string }[], data: Record<string, unknown>) {
    const keys = ['entryId', ...fields.map((field) => field.key)];
    const columns = keys.map((key) => `\`${key}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = [entryId, ...fields.map((field) => this.sqlValue(field.type, data[field.key]))];
    const result = await this.prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`,
      ...values,
    );
    const rows = await this.prisma.$queryRawUnsafe<{ id: number }[]>(`SELECT id FROM \`${tableName}\` WHERE entryId = ?`, entryId);
    return rows[0]?.id ?? Number(result);
  }

  private async updateDynamicRow(
    tableName: string,
    dynamicRowId: number | null,
    entryId: number,
    fields: { key: string; type: string }[],
    data: Record<string, unknown>,
  ) {
    if (!dynamicRowId) return this.insertDynamicRow(tableName, entryId, fields, data);
    const setSql = fields.map((field) => `\`${field.key}\` = ?`).join(', ');
    const values = fields.map((field) => this.sqlValue(field.type, data[field.key]));
    await this.prisma.$executeRawUnsafe(`UPDATE \`${tableName}\` SET ${setSql} WHERE id = ?`, ...values, dynamicRowId);
    return dynamicRowId;
  }

  private sqlValue(type: string, value: unknown) {
    if (['textarea', 'richtext', 'repeater', 'image'].includes(type)) return JSON.stringify(value ?? null);
    return value;
  }
}
