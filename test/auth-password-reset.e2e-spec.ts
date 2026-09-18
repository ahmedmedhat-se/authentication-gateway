import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FakeMailerAdapter } from '../src/mailer/fake-mailer.adapter';
import { MAILER } from '../src/mailer/mailer.port';

describe('Password reset', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fakeMailer: FakeMailerAdapter;
  let server: Server;

  const email = `reset-${Date.now()}@example.com`;
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
    fakeMailer = app.get(MAILER);

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
    await prisma.passwordResetToken.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    if (app) {
      await app.close();
    }
  });

  it('returns 202 for forgot-password regardless of email existence', async () => {
    await request(server)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'does-not-exist@example.com' })
      .expect(202);

    await request(server)
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(202);
  });

  it('resets the password with a valid token', async () => {
    await request(server)
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(202);

    const token = fakeMailer.getLastResetToken(email);
    expect(token).toBeDefined();

    await request(server)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword })
      .expect(204);

    await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
  });

  it('rejects an already-used reset token', async () => {
    const secondEmail = `reset-used-${Date.now()}@example.com`;
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: secondEmail, password })
      .expect(201);
    await prisma.user.update({
      where: { email: secondEmail },
      data: { emailVerified: true },
    });

    await request(server)
      .post('/api/v1/auth/forgot-password')
      .send({ email: secondEmail })
      .expect(202);

    const token = fakeMailer.getLastResetToken(secondEmail);
    expect(token).toBeDefined();

    await request(server)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword })
      .expect(204);

    await request(server)
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'another passphrase 456' })
      .expect(400);
  });

  it('rejects an unknown reset token', async () => {
    await request(server)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'd'.repeat(64), newPassword })
      .expect(400);
  });
});
