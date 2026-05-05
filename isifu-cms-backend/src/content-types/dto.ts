import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { FIELD_TYPES, FieldType } from '../common/field-types';

export class FieldDto {
  @IsString()
  label: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  key: string;

  @IsIn(FIELD_TYPES)
  type: FieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateContentTypeDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  key: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];
}

export class UpdateContentTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];
}
