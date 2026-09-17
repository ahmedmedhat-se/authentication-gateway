import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserService } from '../users/user.service';
import { HasherService } from '../hasher/hasher.service';
import { TokenService } from '../token/token.service';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit-event.enum';
import type { MailerPort } from '../mailer/mailer.port';
import { MAILER } from '../mailer/mailer.port';
import { RequestContext } from '../common/types/request-context';
import { PrismaService } from '../prisma/prisma.service';

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly hasher: HasherService,
    private readonly tokenService: TokenService,
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
}
