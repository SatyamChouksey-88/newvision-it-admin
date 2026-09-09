import { AssetRequestKind } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAssetRequestDto {
  @IsEnum(AssetRequestKind)
  kind!: AssetRequestKind;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  accessoryName?: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class ReviewAssetRequestDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  rejectionReason?: string;
}
