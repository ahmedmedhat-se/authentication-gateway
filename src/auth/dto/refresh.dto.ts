import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(512)
  refreshToken!: string;
}
