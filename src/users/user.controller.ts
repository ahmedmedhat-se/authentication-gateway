import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<{
    id: string;
    email: string;
    emailVerified: boolean;
    roles: string[];
    createdAt: Date;
  }> {
    const row = await this.userService.findById(user.id);
    if (!row) {
      throw new Error('User not found');
    }

    return {
      id: row.id,
      email: row.email,
      emailVerified: row.emailVerified,
      roles: user.roles,
      createdAt: row.createdAt,
    };
  }
}
