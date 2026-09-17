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

describe('Auth — POST /api/v1/auth/change-password', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  const email = `change-${Date.now()}@example.com`;
  const password = 'correct horse battery staple';
  const newPassword = 'a fresh and different passphrase';

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

  async function login(pw: string = password): Promise<TokenPair> {
    const res = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password: pw })
      .expect(200);
    return res.body as TokenPair;
  }

  it('requires authentication', async () => {
    await request(server)
      .post('/api/v1/auth/change-password')
      .send({ currentPassword: password, newPassword })
      .expect(401);
  });

  it('rejects wrong current password', async () => {
    const { accessToken } = await login();

    await request(server)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrong password here 1', newPassword })
      .expect(401);
  });

  it('changes the password and revokes all refresh tokens', async () => {
    const { accessToken, refreshToken } = await login();

    await request(server)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword })
      .expect(204);

    await request(server)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    await login(newPassword);
  });
});
