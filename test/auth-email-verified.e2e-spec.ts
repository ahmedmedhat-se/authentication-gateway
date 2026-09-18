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

describe('EmailVerifiedGuard', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const password = 'correct horse battery staple';
  const newPassword = 'a different passphrase 123';

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

  async function registerUser(email: string): Promise<void> {
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
  }

  async function login(
    email: string,
    pw: string = password,
  ): Promise<TokenPair> {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: pw })
      .expect(200);
    return res.body as TokenPair;
  }

  it('blocks change-password for unverified users with 403', async () => {
    const email = `unverified-${Date.now()}@example.com`;
    await registerUser(email);

    const { accessToken } = await login(email);

    const res = await request(server)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(403);

    expect((res.body as { error: { code: string } }).error.code).toBe(
      'EMAIL_NOT_VERIFIED',
    );
  });

  it('allows change-password after email is verified', async () => {
    const email = `verified-${Date.now()}@example.com`;
    await registerUser(email);

    await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });

    const { accessToken } = await login(email);

    await request(server)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(204);
  });

  it('does not block /users/me for unverified users', async () => {
    const email = `me-unverified-${Date.now()}@example.com`;
    await registerUser(email);

    const { accessToken } = await login(email);

    await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
