import { IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertEntryDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: string;

  @IsObject()
  data: Record<string, unknown>;
}
