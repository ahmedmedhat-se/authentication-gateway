import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../users/user.module';
import { HasherModule } from '../hasher/hasher.module';
import { TokenModule } from '../token/token.module';
import { RoleModule } from '../role/role.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { EmailVerifiedGuard } from './guards/email-verified.guard';

@Module({
  imports: [PassportModule, UserModule, HasherModule, TokenModule, RoleModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: EmailVerifiedGuard },
  ],
})
export class AuthModule {}
