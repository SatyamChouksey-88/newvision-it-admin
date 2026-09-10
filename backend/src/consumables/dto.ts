import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateConsumableDto {
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
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  /** Which office holds this stock. Omit for shared/estate-wide stock. */
  @IsOptional()
  @IsInt()
  locationId?: number;
}

export class UpdateConsumableDto {
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
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsInt()
  locationId?: number;
}

export class IssueConsumableDto {
  @IsInt()
  employeeId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class AdjustConsumableStockDto {
  @IsInt()
  quantityAvailable!: number;
}
