import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { PermissionKey } from '../common/rbac/permissions';

export class CreateCustomRoleDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9][a-z0-9_-]*$/, {
    message: 'key must be lowercase letters, numbers, hyphens, or underscores',
  })
  key!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions!: PermissionKey[];
}

export class UpdateCustomRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: PermissionKey[];
}
