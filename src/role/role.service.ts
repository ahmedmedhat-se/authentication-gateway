import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoleNamesForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { name: true } } },
    });

    return rows.map((row) => row.role.name);
  }

  async getPermissionsForUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: {
        role: {
          select: {
            permissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    const names = new Set<string>();
    for (const row of rows) {
      for (const rp of row.role.permissions) {
        names.add(rp.permission.name);
      }
    }

    return [...names];
  }
}
