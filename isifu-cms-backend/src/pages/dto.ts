import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertPageDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsInt()
  contentTypeId?: number;

  @IsOptional()
  @IsInt()
  entryId?: number;

  @IsOptional()
  @IsArray()
  blocks?: Record<string, unknown>[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
