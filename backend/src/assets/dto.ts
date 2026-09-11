import { PartialType } from '@nestjs/swagger';
import { AssetCondition, AssetStatus } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAssetDto {
  @IsInt() categoryId!: number;
  @IsInt() locationId!: number;
  @IsOptional() @IsInt() departmentId?: number;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() purchaseDate?: string;
  @IsOptional() @IsNumber() purchaseCost?: number;
  @IsOptional() @IsString() warrantyStart?: string;
  @IsOptional() @IsString() warrantyEnd?: string;
  @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() invoiceNo?: string;
  /** Optional explicit code; otherwise auto-generated AST-{LOC}-{CAT}-{SEQ}. */
  @IsOptional() @IsString() assetCode?: string;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
}

export class AssignAssetDto {
  @IsInt() employeeId!: number;
  @IsOptional() @IsString() notes?: string;
  /** Optional accessory IDs to check out alongside this assignment. */
  @IsOptional() @IsArray() @IsInt({ each: true }) accessoryIds?: number[];
  /** Optional loaner due date — does not auto check-in. */
  @IsOptional() @IsDateString() expectedReturnAt?: string;
}

export class AuditAssetDto {
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() nextAuditDueAt?: string;
}

export class TransferAssetDto {
  @IsOptional() @IsInt() toEmployeeId?: number;
  @IsOptional() @IsInt() toLocationId?: number;
  @IsOptional() @IsString() reason?: string;
}

export class ChangeStatusDto {
  @IsEnum(AssetStatus) status!: AssetStatus;
  @IsOptional() @IsString() reason?: string;
}

export class RetireAssetDto {
  @IsOptional() @IsString() reason?: string;
}

export type BulkAssetAction = 'status' | 'transfer' | 'retire' | 'assign';

export class BulkAssetsDto {
  @IsArray() @ArrayNotEmpty() @IsInt({ each: true }) ids!: number[];
  @IsIn(['status', 'transfer', 'retire', 'assign']) action!: BulkAssetAction;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsInt() toEmployeeId?: number;
  @IsOptional() @IsInt() toLocationId?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsInt() employeeId?: number;
  @IsOptional() @IsDateString() expectedReturnAt?: string;
}

export class CreateIssueKitDto {
  @IsString() name!: string;
  @IsInt() categoryId!: number;
  @IsOptional() @IsInt() locationId?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) accessoryIds?: number[];
}

export class UpdateIssueKitDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsInt() locationId?: number | null;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) accessoryIds?: number[];
}

export class IssueKitToEmployeeDto {
  @IsInt() employeeId!: number;
}
