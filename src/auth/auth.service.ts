import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserService } from '../users/user.service';
import { HasherService } from '../hasher/hasher.service';
import { TokenService } from '../token/token.service';
import { RoleService } from '../role/role.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit-event.enum';
import type { MailerPort } from '../mailer/mailer.port';
import { MAILER } from '../mailer/mailer.port';
import { RequestContext } from '../common/types/request-context';
import { PrismaService } from '../prisma/prisma.service';

const DUMMY_HASH =
  '$2b$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly hasher: HasherService,
    private readonly tokenService: TokenService,
    private readonly roleService: RoleService,
    private readonly auditService: AuditService,
    @Inject(MAILER) private readonly mailer: MailerPort,
  ) {}

  async register(
    email: string,
    password: string,
    ctx: RequestContext,
  ): Promise<PublicUser> {
    const existing = await this.userService.findByEmail(email);
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await this.hasher.hash(password);

    let user: {
      id: string;
      email: string;
      emailVerified: boolean;
      createdAt: Date;
    };
    let rawVerificationToken: string;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: email.trim().toLowerCase(),
            passwordHash,
          },
        });

        const rawToken = await this.tokenService.createEmailVerificationToken(
          created.id,
          tx,
        );

        const role = await tx.role.findUnique({
          where: { name: 'user' },
        });
        if (!role) {
          throw new Error('Default role "user" not found. Run prisma db seed.');
        }
        await tx.userRole.create({
          data: { userId: created.id, roleId: role.id },
        });

        await this.auditService.record(
          {
            event: AuditEvent.USER_REGISTERED,
            userId: created.id,
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          },
          tx,
        );

        return { user: created, rawToken };
      });

      user = result.user;
      rawVerificationToken = result.rawToken;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('EMAIL_ALREADY_REGISTERED');
      }
      throw error;
    }

    try {
      await this.mailer.sendVerificationEmail(user.email, rawVerificationToken);
    } catch {
      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      };
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  async login(
    email: string,
    password: string,
    ctx: RequestContext,
  ): Promise<LoginResult> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      await this.hasher.compare(password, DUMMY_HASH);
      await this.auditService.record({
        event: AuditEvent.LOGIN_FAILED,
        userId: null,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    }

    const valid = await this.hasher.compare(password, user.passwordHash);
    if (!valid) {
      await this.auditService.record({
        event: AuditEvent.LOGIN_FAILED,
        userId: user.id,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    }

    const roles = await this.roleService.getRoleNamesForUser(user.id);
    const accessToken = await this.tokenService.issueAccessToken(
      user.id,
      roles,
    );
    const { rawToken } = await this.tokenService.issueRefreshToken(user.id);

    await this.auditService.record({
      event: AuditEvent.LOGIN_SUCCESS,
      userId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken: rawToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  async refresh(
    refreshToken: string,
    ctx: RequestContext,
  ): Promise<RefreshResult> {
    let rotated: { userId: string; rawToken: string; familyId: string };

    try {
      rotated = await this.tokenService.rotateRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof Error && error.message === 'REFRESH_TOKEN_REUSE') {
        await this.auditService.record({
          event: AuditEvent.REFRESH_REUSE_DETECTED,
          userId: null,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });
      }
      throw new UnauthorizedException('AUTH_INVALID_REFRESH_TOKEN');
    }

    const roles = await this.roleService.getRoleNamesForUser(rotated.userId);
    const accessToken = await this.tokenService.issueAccessToken(
      rotated.userId,
      roles,
    );

    await this.auditService.record({
      event: AuditEvent.REFRESH_SUCCESS,
      userId: rotated.userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      accessToken,
      refreshToken: rotated.rawToken,
      expiresIn: 900,
      tokenType: 'Bearer',
    };
  }

  async logout(refreshToken: string, ctx: RequestContext): Promise<void> {
    const userId = await this.tokenService.revokeRefreshToken(refreshToken);

    if (userId !== null) {
      await this.auditService.record({
        event: AuditEvent.LOGOUT,
        userId,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ctx: RequestContext,
  ): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('AUTH_REQUIRED');
    }

    const valid = await this.hasher.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    }

    const newHash = await this.hasher.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await this.userService.updatePassword(userId, newHash, tx);

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record(
        {
          event: AuditEvent.PASSWORD_CHANGED,
          userId,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
  }

  async verifyEmail(token: string, ctx: RequestContext): Promise<void> {
    let userId: string;

    try {
      userId = await this.tokenService.consumeEmailVerificationToken(token);
    } catch {
      throw new BadRequestException('AUTH_INVALID_VERIFICATION_TOKEN');
    }

    await this.auditService.record({
      event: AuditEvent.EMAIL_VERIFIED,
      userId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
