import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(512)
  token!: string;
}
