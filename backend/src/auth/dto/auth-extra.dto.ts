import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../common/password';

export class RefreshDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsInt()
  uid!: number;

  @IsString()
  token!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  newPassword!: string;
}

export class MfaVerifyDto {
  @IsOptional()
  @IsString()
  mfa_token?: string;

  @IsOptional()
  @IsString()
  mfaToken?: string;

  @IsString()
  @MinLength(6)
  code!: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

export class MfaEnableDto {
  @IsString()
  @MinLength(6)
  code!: string;
}

export class SignupDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;

  @IsOptional()
  @IsBoolean()
  loadSample?: boolean;
}

export class DisableMfaDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  code!: string;
}
