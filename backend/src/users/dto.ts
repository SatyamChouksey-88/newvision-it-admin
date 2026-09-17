import { RoleName } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../common/password';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEnum(RoleName)
  role!: RoleName;

  @IsOptional()
  @IsInt()
  employeeId?: number;

  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @IsOptional()
  @IsInt()
  employeeId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Assign or clear a tenant custom role (null clears). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  customRoleId?: number | null;
}

export class AdminResetPasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password?: string;
}
