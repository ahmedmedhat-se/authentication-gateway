import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(512)
  refreshToken!: string;
}
