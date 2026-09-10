import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { EmailNotifyPref, TicketPriority, TicketStatus } from '@prisma/client';

function toIntArray({ value }: { value: unknown }) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

export class CreateTicketDto {
  @IsString() @MinLength(3) subject!: string;
  @IsString() @MinLength(3) description!: string;
  @Type(() => Number) @IsInt() categoryId!: number;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @Type(() => Number) @IsInt() assetId?: number;
  @IsOptional() @Type(() => Number) @IsInt() locationId?: number;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @Type(() => Number) @IsInt() templateId?: number;
  @IsOptional() @Type(() => Number) @IsInt() raisedByEmployeeId?: number;
  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  watcherEmployeeIds?: number[];
  @IsOptional() @IsBoolean() autoAssign?: boolean;
}

export class UpdateTicketDto {
  @IsOptional() @IsString() @MinLength(3) subject?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @Type(() => Number) @IsInt() assetId?: number | null;
  @IsOptional() @Type(() => Number) @IsInt() locationId?: number | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
}

export class AssignTicketDto {
  @IsOptional() @Type(() => Number) @IsInt() userId?: number | null;
}

export class TransitionTicketDto {
  @IsEnum(TicketStatus) status!: TicketStatus;
}

export class CommentDto {
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsBoolean() isInternal?: boolean;
}

export class WatcherDto {
  @Type(() => Number) @IsInt() employeeId!: number;
}

export class TimeLogDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(24 * 60) minutes!: number;
  @IsOptional() @IsString() note?: string;
}

export class CannedDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) body!: string;
}

export class TemplateDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) subject!: string;
  @IsString() @MinLength(2) description!: string;
  @Type(() => Number) @IsInt() categoryId!: number;
}

export class RateTicketDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() comment?: string;
}

export class DuplicateDto {
  @IsString() @MinLength(3) originalTicketNumber!: string;
}

export class BulkAssignDto {
  @Transform(toIntArray) @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) ids!: number[];
  @Type(() => Number) @IsInt() userId!: number;
}

export class BulkCloseDto {
  @Transform(toIntArray) @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) ids!: number[];
  @IsString() @MinLength(1) comment!: string;
}

export class CategoryDto {
  @IsString() @MinLength(2) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsEnum(TicketPriority) defaultPriority?: TicketPriority;
}

export class NotifyPrefDto {
  @IsEnum(EmailNotifyPref) pref!: EmailNotifyPref;
}

export class CategoryUpdateDto {
  @IsOptional() @Type(() => Number) @IsInt() id?: number;
  @IsString() @MinLength(2) code!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsEnum(TicketPriority) defaultPriority?: TicketPriority;
}

export class ManualEditDto {
  @IsString() @MinLength(3) reason!: string;
  @IsObject() fields!: Record<string, unknown>;
}

export class CreateNoteDto {
  @IsString() entityType!: string;
  @IsString() entityId!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsBoolean() isBackfilled?: boolean;
}

export class BackfillAssignmentDto {
  @Type(() => Number) @IsInt() employeeId!: number;
  @IsDateString() assignedAt!: string;
  @IsOptional() @IsString() notes?: string;
  @IsString() @MinLength(3) reason!: string;
}

export class BackfillMaintenanceDto {
  @Type(() => Number) @IsInt() assetId!: number;
  @IsString() @MinLength(3) issue!: string;
  @IsDateString() reportedAt!: string;
  @IsString() @MinLength(3) reason!: string;
}
