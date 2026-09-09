import { ArrayNotEmpty, IsArray, IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateWebhookDto {
  @IsString() @Matches(/^https?:\/\/.+/i, { message: 'url must start with http:// or https://' }) url!: string;
  @IsOptional() @IsString() secret?: string;
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) events!: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateWebhookDto {
  @IsOptional() @IsString() @Matches(/^https?:\/\/.+/i) url?: string;
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}
