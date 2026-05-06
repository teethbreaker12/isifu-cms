import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

export const FORM_FIELD_TYPES = ['text', 'email', 'phone', 'date', 'textarea', 'select', 'checkbox', 'hidden'] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export class FormFieldDto {
  @IsString()
  label: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  key: string;

  @IsIn(FORM_FIELD_TYPES)
  type: FormFieldType;

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

export class UpsertFormDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  key: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  notificationSubject?: string;

  @IsOptional()
  @IsBoolean()
  responderEnabled?: boolean;

  @IsOptional()
  @IsString()
  responderEmailField?: string;

  @IsOptional()
  @IsString()
  responderSubject?: string;

  @IsOptional()
  @IsString()
  responderMessage?: string;

  @IsOptional()
  @IsString()
  successMessage?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}

export class SubmitFormDto {
  @IsObject()
  data: Record<string, unknown>;
}
