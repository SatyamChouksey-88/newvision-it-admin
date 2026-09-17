import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString() @MinLength(2) @MaxLength(32) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateVdiDto {
  @IsInt() clientId!: number;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(120) poolName?: string;
}

export class AssignEmployeeClientDto {
  @IsInt() employeeId!: number;
  @IsInt() clientId!: number;
}
