import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PermissionSeed {
  name: string;
  description: string;
}

const PERMISSIONS: PermissionSeed[] = [
  { name: 'users:read', description: 'Read user data' },
  { name: 'users:write', description: 'Modify user data' },
  { name: 'roles:read', description: 'Read roles and permissions' },
  { name: 'roles:assign', description: 'Assign or revoke roles' },
];

async function seedPermissions(): Promise<void> {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
}

async function seedRoles(): Promise<{ userId: string; adminId: string }> {
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: { name: 'user', description: 'Default role for registered users' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrative role' },
  });

  return { userId: userRole.id, adminId: adminRole.id };
}

async function grantPermissions(
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  for (const permissionId of permissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      update: {},
      create: { roleId, permissionId },
    });
  }
}

async function main(): Promise<void> {
  await seedPermissions();

  const { userId, adminId } = await seedRoles();

  const allPermissions = await prisma.permission.findMany();
  const userPermissionIds = allPermissions
    .filter((p) => p.name === 'users:read')
    .map((p) => p.id);
  const adminPermissionIds = allPermissions.map((p) => p.id);

  await grantPermissions(userId, userPermissionIds);
  await grantPermissions(adminId, adminPermissionIds);

  process.stdout.write('Seed complete.\n');
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
