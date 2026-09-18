import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RoleWithPermissions {
  name: string;
  description: string | null;
  permissions: string[];
}

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

  async listRolesWithPermissions(): Promise<RoleWithPermissions[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((rp) => rp.permission.name),
    }));
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException('ROLE_NOT_FOUND');
    }

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }

  async revokeRole(userId: string, roleName: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) {
      throw new NotFoundException('ROLE_NOT_FOUND');
    }

    await this.prisma.userRole.deleteMany({
      where: { userId, roleId: role.id },
    });
  }

  async isLastAdmin(userId: string): Promise<boolean> {
    const adminRole = await this.prisma.role.findUnique({
      where: { name: 'admin' },
    });
    if (!adminRole) {
      return false;
    }

    const hasAdmin = await this.prisma.userRole.findUnique({
      where: { userId_roleId: { userId, roleId: adminRole.id } },
    });
    if (!hasAdmin) {
      return false;
    }

    const adminCount = await this.prisma.userRole.count({
      where: { roleId: adminRole.id },
    });
    return adminCount <= 1;
  }
}
