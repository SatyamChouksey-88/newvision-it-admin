import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

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
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
