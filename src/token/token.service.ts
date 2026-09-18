import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenService {
  private static readonly VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
  private static readonly REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createEmailVerificationToken(
    userId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TokenService.VERIFICATION_TTL_MS);

    await client.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  async issueAccessToken(userId: string, roles: string[]): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, roles });
  }

  async issueRefreshToken(
    userId: string,
    familyId?: string,
  ): Promise<{ rawToken: string; familyId: string }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const family = familyId ?? randomUUID();
    const expiresAt = new Date(Date.now() + TokenService.REFRESH_TTL_MS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, familyId: family, expiresAt },
    });

    return { rawToken, familyId: family };
  }

  async rotateRefreshToken(rawToken: string): Promise<{
    userId: string;
    rawToken: string;
    familyId: string;
  }> {
    const tokenHash = this.hashToken(rawToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (existing.revokedAt !== null) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('REFRESH_TOKEN_REUSE');
    }

    if (existing.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const newRawToken = randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newRawToken);
    const expiresAt = new Date(Date.now() + TokenService.REFRESH_TTL_MS);

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });

      await tx.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: newTokenHash,
          familyId: existing.familyId,
          expiresAt,
        },
      });

      return {
        userId: existing.userId,
        rawToken: newRawToken,
        familyId: existing.familyId,
      };
    });
  }

  async revokeRefreshToken(rawToken: string): Promise<string | null> {
    const tokenHash = this.hashToken(rawToken);

    const result = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      return null;
    }

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    return row?.userId ?? null;
  }

  async consumeEmailVerificationToken(rawToken: string): Promise<string> {
    const tokenHash = this.hashToken(rawToken);

    return this.prisma.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
      });

      if (!token || token.usedAt !== null || token.expiresAt < new Date()) {
        throw new Error('INVALID_VERIFICATION_TOKEN');
      }

      await tx.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: token.userId },
        data: { emailVerified: true },
      });

      return token.userId;
    });
  }

  async createPasswordResetToken(
    userId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await client.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    });

    await client.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  async consumePasswordResetToken(rawToken: string): Promise<string> {
    const tokenHash = this.hashToken(rawToken);

    return this.prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!token || token.usedAt !== null || token.expiresAt < new Date()) {
        throw new Error('INVALID_RESET_TOKEN');
      }

      await tx.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });

      return token.userId;
    });
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
