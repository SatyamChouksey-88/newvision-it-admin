import { ChatNotifyPref, ChatPresenceMode, ChatVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PostMessageDto {
  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}

export class OpenDmDto {
  @Type(() => Number)
  @IsInt()
  userId!: number;
}

export class OpenGroupDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  userIds!: number[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}

export class CreateChannelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  topic?: string;

  @IsOptional()
  @IsEnum(ChatVisibility)
  visibility?: ChatVisibility;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  memberIds?: number[];
}

export class PatchChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  topic?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsEnum(ChatVisibility)
  visibility?: ChatVisibility;
}

export class AddMembersDto {
  @IsArray()
  @ArrayMaxSize(40)
  @IsInt({ each: true })
  userIds!: number[];
}

export class MemberPrefsDto {
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsEnum(ChatNotifyPref)
  notifyPref?: ChatNotifyPref;
}

export class EditMessageDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class ReactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  emoji!: string;
}

export class PresenceDto {
  @IsEnum(ChatPresenceMode)
  mode!: ChatPresenceMode;
}
