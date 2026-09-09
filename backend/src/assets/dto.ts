import { PartialType } from '@nestjs/swagger';
import { AssetCondition, AssetStatus } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

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

export type BulkAssetAction = 'status' | 'transfer' | 'retire';

export class BulkAssetsDto {
  @IsArray() @ArrayNotEmpty() @IsInt({ each: true }) ids!: number[];
  @IsEnum(['status', 'transfer', 'retire']) action!: BulkAssetAction;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsInt() toEmployeeId?: number;
  @IsOptional() @IsInt() toLocationId?: number;
  @IsOptional() @IsString() reason?: string;
}
