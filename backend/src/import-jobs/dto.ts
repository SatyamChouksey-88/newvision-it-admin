import { IsObject, IsOptional } from 'class-validator';

export class PreviewImportDto {
  @IsObject() mapping!: Record<string, string>;
}

export class CommitImportDto {
  @IsOptional() @IsObject() mapping?: Record<string, string>;
}
