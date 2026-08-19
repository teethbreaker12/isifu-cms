import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { columnTypeForField } from '../common/field-types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentTypeDto, FieldDto, UpdateContentTypeDto } from './dto';

@Injectable()
export class ContentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.contentType.findMany({
      include: { fields: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByKey(key: string) {
    const contentType = await this.prisma.contentType.findUnique({
      where: { key },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!contentType) throw new NotFoundException('Content type not found');
    return contentType;
  }

  async create(dto: CreateContentTypeDto) {
    this.assertUniqueFields(dto.fields);
    const tableName = `content_${dto.key}`;
    await this.ensureDynamicTable(tableName, dto.fields);

    return this.prisma.contentType.create({
      data: {
        name: dto.name,
        key: dto.key,
        description: dto.description,
        status: dto.status ?? 'draft',
        tableName,
        fields: { create: this.fieldCreateInput(dto.fields) },
      },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
  }

  async update(key: string, dto: UpdateContentTypeDto) {
    this.assertUniqueFields(dto.fields);
    const existing = await this.findByKey(key);
    await this.ensureDynamicTable(existing.tableName, dto.fields, existing.fields as FieldDto[]);

    return this.prisma.$transaction(async (tx) => {
      await tx.contentField.deleteMany({ where: { contentTypeId: existing.id } });
      return tx.contentType.update({
        where: { id: existing.id },
        data: {
          name: dto.name,
          description: dto.description,
          status: dto.status,
          fields: { create: this.fieldCreateInput(dto.fields) },
        },
        include: { fields: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async remove(key: string) {
    const contentType = await this.findByKey(key);
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${contentType.tableName}\``);
    return this.prisma.contentType.delete({ where: { id: contentType.id } });
  }

  private async ensureDynamicTable(tableName: string, nextFields: FieldDto[], currentFields: FieldDto[] = []) {
    const baseSql = [
      '`id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY',
      '`entryId` INT NULL',
      '`createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
      '`updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    ];
    await this.prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`${tableName}\` (${baseSql.join(', ')})`);

    const currentKeys = new Set(currentFields.map((field) => field.key));
    for (const field of nextFields) {
      if (!currentKeys.has(field.key)) {
        await this.prisma.$executeRawUnsafe(
          `ALTER TABLE \`${tableName}\` ADD COLUMN \`${field.key}\` ${columnTypeForField(field.type)}`,
        );
      } else {
        const current = currentFields.find((item) => item.key === field.key);
        if (current && (current.type !== field.type || field.type === 'image')) {
          await this.prisma.$executeRawUnsafe(
            `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${field.key}\` ${columnTypeForField(field.type)}`,
          );
        }
      }
    }

    for (const field of currentFields) {
      if (!nextFields.some((next) => next.key === field.key)) {
        await this.prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${field.key}\``);
      }
    }
  }

  private assertUniqueFields(fields: FieldDto[]) {
    const keys = new Set<string>();
    for (const field of fields) {
      if (keys.has(field.key)) throw new BadRequestException(`Duplicate field key: ${field.key}`);
      keys.add(field.key);
    }
  }

  private fieldCreateInput(fields: FieldDto[]) {
    return fields.map((field, index) => ({
      label: field.label,
      key: field.key,
      type: field.type,
      required: field.required ?? false,
      settings: field.settings as Prisma.InputJsonObject | undefined,
      order: field.order ?? index,
    }));
  }
}
