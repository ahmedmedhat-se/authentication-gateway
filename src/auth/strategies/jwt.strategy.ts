import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../users/user.service';
import { RoleService } from '../../role/role.service';
import { AuthenticatedUser } from '../types/authenticated-user';

interface JwtPayload {
  sub: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly userService: UserService,
    private readonly roleService: RoleService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('AUTH_REQUIRED');
    }

    const roles = await this.roleService.getRoleNamesForUser(user.id);

    return {
      id: user.id,
      email: user.email,
      roles,
    };
  }
}
