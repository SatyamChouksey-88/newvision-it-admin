import { IsBoolean, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSavedViewDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsString() resource?: string;
  @IsObject() filters!: Record<string, unknown>;
  @IsOptional() @IsBoolean() isShared?: boolean;
}

export class UpdateSavedViewDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsBoolean() isShared?: boolean;
}
