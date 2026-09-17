import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAuditCycleDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) scopeNote?: string;
}

export class UpdateAuditCycleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) scopeNote?: string;
}

export class CreateAuditFindingDto {
  @IsOptional() @IsInt() assetId?: number;
  @IsString() @MinLength(2) @MaxLength(80) exceptionType!: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() @MaxLength(500) evidenceUrl?: string;
}
