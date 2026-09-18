import { IsString, MaxLength, MinLength } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  roleName!: string;
}
