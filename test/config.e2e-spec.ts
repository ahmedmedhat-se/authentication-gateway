import { Test } from '@nestjs/testing';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  jest,
} from '@jest/globals';
import { AppModule } from '../src/app.module';

describe('Config validation (integration)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('fails to boot when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow();
  });

  it('fails to boot when JWT_SECRET is too short', async () => {
    process.env.JWT_SECRET = 'short';

    await expect(
      Test.createTestingModule({ imports: [AppModule] }).compile(),
    ).rejects.toThrow();
  });
});
