import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

describe('Auth — POST /api/v1/auth/login', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const email = `login-${Date.now()}@example.com`;
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

  it('logs in and returns a token pair', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const body = res.body as LoginResponseBody;
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBeGreaterThan(0);
  });

  it('rejects wrong password with a generic 401', async () => {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong password here 12' })
      .expect(401);

    const body = res.body as { message?: string };
    expect(JSON.stringify(body)).not.toContain('password');
  });

  it('rejects unknown email with the same 401 as wrong password', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'does-not-exist@example.com', password })
      .expect(401);
  });

  it('rejects invalid body with 400', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: 'short' })
      .expect(400);
  });
});
