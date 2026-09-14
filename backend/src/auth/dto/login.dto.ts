import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  /** Login must accept existing passwords; strength is enforced on set/change/reset. */
  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
