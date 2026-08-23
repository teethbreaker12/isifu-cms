import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMediaFolderDto {
  @IsString()
  name: string;
}

export class UpdateMediaFolderDto {
  @IsString()
  name: string;
}

export class UpdateMediaAssetFolderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number | null;
}

export class UploadMediaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number;
}
