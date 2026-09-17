import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakeMailerAdapter } from '../src/mailer/fake-mailer.adapter';
import { MAILER } from '../src/mailer/mailer.port';

describe('Auth — POST /api/v1/auth/verify-email', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeMailer: FakeMailerAdapter;
  let server: Server;

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
    fakeMailer = app.get(MAILER);

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

  it('verifies a valid token and marks the user verified', async () => {
    const email = `verify-${Date.now()}@example.com`;
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery staple' })
      .expect(201);

    const token = fakeMailer.getLastVerificationToken(email);
    expect(token).toBeDefined();

    const res = await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(200);

    expect((res.body as { emailVerified: boolean }).emailVerified).toBe(true);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.emailVerified).toBe(true);
  });

  it('rejects an already-used token', async () => {
    const email = `verify-used-${Date.now()}@example.com`;
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery staple' })
      .expect(201);

    const token = fakeMailer.getLastVerificationToken(email);
    expect(token).toBeDefined();

    await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(200);

    await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(400);
  });

  it('rejects an unknown token', async () => {
    await request(server)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'c'.repeat(64) })
      .expect(400);
  });
});
