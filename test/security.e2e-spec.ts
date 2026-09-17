import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { buildCorsOptions } from '../src/common/config/cors.config';

describe('Security headers and CORS', () => {
  let app: INestApplication;
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');

    const config = app.get(ConfigService);
    app.enableCors(buildCorsOptions(config));

    await app.init();

    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(server).get('/api/v1/health/live').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options', async () => {
    const res = await request(server).get('/api/v1/health/live').expect(200);
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('sets Referrer-Policy', async () => {
    const res = await request(server).get('/api/v1/health/live').expect(200);
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  it('does not allow arbitrary origins', async () => {
    const res = await request(server)
      .get('/api/v1/health/live')
      .set('Origin', 'http://evil.example.com')
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows the configured origin', async () => {
    const config = app.get(ConfigService);
    const firstOrigin = (config.get<string>('CORS_ORIGINS') ?? '')
      .split(',')[0]
      .trim();

    const res = await request(server)
      .get('/api/v1/health/live')
      .set('Origin', firstOrigin)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(firstOrigin);
  });
});
