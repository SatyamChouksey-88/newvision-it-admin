import { IsEmail, IsInt, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  refresh_token!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
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
  @MinLength(6)
  newPassword!: string;
}
