import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

describe('Admin role endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const adminEmail = `admin-${Date.now()}@example.com`;
  const userEmail = `user-${Date.now()}@example.com`;
  const password = 'correct horse battery staple';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user', description: 'Default role' },
    });
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Administrative role' },
    });
    const rolesRead = await prisma.permission.upsert({
      where: { name: 'roles:read' },
      update: {},
      create: { name: 'roles:read', description: 'Read roles and permissions' },
    });
    const rolesAssign = await prisma.permission.upsert({
      where: { name: 'roles:assign' },
      update: {},
      create: { name: 'roles:assign', description: 'Assign or revoke roles' },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: rolesRead.id,
        },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: rolesRead.id },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: rolesAssign.id,
        },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: rolesAssign.id },
    });

    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: adminEmail, password })
      .expect(201);
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: userEmail, password })
      .expect(201);

    const adminUser = await prisma.user.findUniqueOrThrow({
      where: { email: adminEmail },
    });
    const normalUser = await prisma.user.findUniqueOrThrow({
      where: { email: userEmail },
    });

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { emailVerified: true },
    });
    await prisma.user.update({
      where: { id: normalUser.id },
      data: { emailVerified: true },
    });

    await prisma.userRole.create({
      data: { userId: adminUser.id, roleId: adminRole.id },
    });
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({});
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    if (app) {
      await app.close();
    }
  });

  async function login(email: string): Promise<TokenPair> {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body as TokenPair;
  }

  it('lists roles with permissions for admin', async () => {
    const { accessToken } = await login(adminEmail);
    const res = await request(server)
      .get('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const roles = res.body as Array<{ name: string; permissions: string[] }>;
    expect(roles.some((r) => r.name === 'admin')).toBe(true);
    expect(roles.some((r) => r.name === 'user')).toBe(true);
  });

  it('rejects listing for a user without roles:read', async () => {
    const { accessToken } = await login(userEmail);
    await request(server)
      .get('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('assigns the admin role to a user', async () => {
    const { accessToken: adminToken } = await login(adminEmail);
    const normal = await prisma.user.findUniqueOrThrow({
      where: { email: userEmail },
    });

    await request(server)
      .post('/api/v1/admin/roles/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: normal.id, roleName: 'admin' })
      .expect(204);

    const { accessToken: userToken } = await login(userEmail);
    await request(server)
      .get('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });

  it('prevents revoking your own last admin role', async () => {
    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'admin' },
    });
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: adminEmail },
    });

    // Ensure only the actor is an admin at this point.
    await prisma.userRole.deleteMany({
      where: { roleId: adminRole.id, userId: { not: admin.id } },
    });

    const { accessToken: adminToken } = await login(adminEmail);

    const res = await request(server)
      .post('/api/v1/admin/roles/revoke')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: admin.id, roleName: 'admin' })
      .expect(403);

    expect((res.body as { error: { code: string } }).error.code).toBe(
      'CANNOT_REVOKE_LAST_ADMIN',
    );
  });
});
