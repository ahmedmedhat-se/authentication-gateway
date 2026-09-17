import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface RegisterResponseBody {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

describe('Auth — POST /api/v1/auth/register', () => {
  let app: INestApplication;
  let prisma: PrismaService;
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

    await prisma.role.upsert({
      where: { name: 'user' },
      update: {},
      create: { name: 'user', description: 'Default role' },
    });
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({});
    await prisma.emailVerificationToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    if (app) {
      await app.close();
    }
  });

  it('registers a new user', async () => {
    const email = `user-${Date.now()}@example.com`;

    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery staple' })
      .expect(201);

    const body = res.body as RegisterResponseBody;

    expect(body).toMatchObject({ email, emailVerified: false });
    expect(body.id).toBeDefined();
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate email with 409', async () => {
    const email = `dup-${Date.now()}@example.com`;
    const payload = { email, password: 'correct horse battery staple' };

    await request(server)
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(201);

    await request(server)
      .post('/api/v1/auth/register')
      .send(payload)
      .expect(409);
  });

  it('rejects weak password with 400', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send({ email: `weak-${Date.now()}@example.com`, password: 'short' })
      .expect(400);
  });

  it('rejects unknown fields with 400', async () => {
    await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: `mass-${Date.now()}@example.com`,
        password: 'correct horse battery staple',
        roles: ['admin'],
      })
      .expect(400);
  });

  it('normalizes the email to lowercase', async () => {
    const email = `MiXeD-${Date.now()}@Example.COM`;

    const res = await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password: 'correct horse battery staple' })
      .expect(201);

    const body = res.body as RegisterResponseBody;

    expect(body.email).toBe(email.toLowerCase());
  });
});
