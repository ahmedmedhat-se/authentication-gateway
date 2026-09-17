import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(email: string, passwordHash: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: this.normalizeEmail(email),
        passwordHash,
      },
    });
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await client.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async markVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
