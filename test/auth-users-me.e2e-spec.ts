import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface MeResponseBody {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

describe('GET /api/v1/users/me', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const email = `me-${Date.now()}@example.com`;
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

  it('returns the current user with roles', async () => {
    const { accessToken } = await login();

    const res = await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as MeResponseBody;
    expect(body.email).toBe(email);
    expect(body.emailVerified).toBe(true);
    expect(body.roles).toEqual(['user']);
    expect(body.id).toBeDefined();
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('rejects unauthenticated access with 401', async () => {
    await request(server).get('/api/v1/users/me').expect(401);
  });

  it('rejects an invalid token with 401', async () => {
    await request(server)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });
});
