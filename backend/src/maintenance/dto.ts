import { MaintenanceStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMaintenanceDto {
  @IsInt() assetId!: number;
  @IsString() @MinLength(3) issue!: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsNumber() estimatedCost?: number;
  @IsOptional() @IsString() expectedCompletionDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateMaintenanceDto {
  @IsOptional() @IsString() @MinLength(3) issue?: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsNumber() estimatedCost?: number;
  @IsOptional() @IsNumber() actualCost?: number;
  @IsOptional() @IsString() expectedCompletionDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class TransitionMaintenanceDto {
  @IsEnum(MaintenanceStatus) status!: MaintenanceStatus;
  /** Recorded when moving to `repaired`/`reassigned`. */
  @IsOptional() @IsNumber() actualCost?: number;
  @IsOptional() @IsString() notes?: string;
  /** Optional: reassign to a different employee when moving to `reassigned`. */
  @IsOptional() @IsInt() toEmployeeId?: number;
}
