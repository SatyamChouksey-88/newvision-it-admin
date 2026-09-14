import { IsDateString, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAccessoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsInt()
  @Min(0)
  quantityTotal!: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  /**
   * Which office holds this stock. Omit or send null for estate-wide stock
   * (explicit, not a silent drop).
   */
  @IsOptional()
  @IsInt()
  locationId?: number | null;
}

export class UpdateAccessoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantityTotal?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsInt()
  locationId?: number | null;
}

export class CheckoutAccessoryDto {
  @IsInt()
  employeeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsInt()
  issuedWithAssetId?: number;

  @IsOptional()
  @IsDateString()
  expectedReturnAt?: string;
}

export class CheckinAccessoryDto {
  @IsInt()
  checkoutId!: number;
}

export class AdjustStockDto {
  @IsInt()
  quantityTotal!: number;
}
