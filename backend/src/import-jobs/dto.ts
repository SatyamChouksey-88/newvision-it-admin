import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class PreviewImportDto {
  @IsObject() mapping!: Record<string, string>;
}

export class CommitImportDto {
  @IsOptional() @IsObject() mapping?: Record<string, string>;
  /** When true, validate rows and duplicates only — no database writes (migration dry-run). */
  @IsOptional() @IsBoolean() validateOnly?: boolean;
}
