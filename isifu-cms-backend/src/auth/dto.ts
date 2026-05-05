import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  @Length(6, 32)
  totpCode?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class VerifyTotpDto {
  @IsString()
  @Length(6, 32)
  code: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @Length(8, 128)
  newPassword: string;
}
