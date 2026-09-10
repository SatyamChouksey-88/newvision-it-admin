import { PartialType } from '@nestjs/swagger';
import { EmploymentType, RoleName } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @MinLength(2) employeeCode!: string;
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() designation?: string;
  @IsInt() locationId!: number;
  @IsOptional() @IsInt() departmentId?: number;
  @IsOptional() @IsInt() managerId?: number;
  @IsOptional() @IsString() dateJoined?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsString() contractEndDate?: string;

  /** B2: optionally create a login (a "set your own password" email link) in the same action. */
  @IsOptional() @IsBoolean() createLogin?: boolean;
  @IsOptional() @IsEnum(RoleName) loginRole?: RoleName;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}

export class OffboardEmployeeDto {
  @IsOptional()
  @IsString()
  notes?: string;

  /** Return assigned assets to the available pool (default). */
  @IsOptional()
  @IsBoolean()
  returnAssets?: boolean;

  /** Reassign all assigned assets to this employee instead of returning them. */
  @IsOptional()
  @IsInt()
  reassignAssetsToId?: number;
}
