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

describe('Auth — POST /api/v1/auth/refresh', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const email = `refresh-${Date.now()}@example.com`;
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

    await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
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

  async function login(): Promise<TokenPair> {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    return res.body as TokenPair;
  }

  it('rotates the refresh token', async () => {
    const { refreshToken } = await login();

    const res = await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const body = res.body as TokenPair;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('rejects an already-rotated refresh token', async () => {
    const { refreshToken } = await login();

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('revokes the entire family when a reused token is presented', async () => {
    const { refreshToken: t1 } = await login();

    const rotateRes = await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: t1 })
      .expect(200);
    const t2 = (rotateRes.body as TokenPair).refreshToken;

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: t1 })
      .expect(401);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: t2 })
      .expect(401);
  });

  it('rejects an unknown refresh token', async () => {
    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'a'.repeat(64) })
      .expect(401);
  });
});
