import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

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
}

export class CheckinAccessoryDto {
  @IsInt()
  checkoutId!: number;
}

export class AdjustStockDto {
  @IsInt()
  quantityTotal!: number;
}
