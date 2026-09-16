import { describe, it, expect } from '@jest/globals';
import { validationSchema } from './validation.schema';

interface ValidatedEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  BCRYPT_COST: number;
}

describe('validationSchema', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
  };

  it('accepts a valid minimal env', () => {
    const { error } = validationSchema.validate(validEnv);
    expect(error).toBeUndefined();
  });

  it('rejects missing DATABASE_URL', () => {
    const { error } = validationSchema.validate({ JWT_SECRET: 'a'.repeat(32) });
    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('rejects missing JWT_SECRET', () => {
    const { error } = validationSchema.validate({
      DATABASE_URL: 'postgresql://x',
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_SECRET');
  });

  it('rejects JWT_SECRET shorter than 32 chars', () => {
    const { error } = validationSchema.validate({
      DATABASE_URL: 'postgresql://x',
      JWT_SECRET: 'short',
    });
    expect(error).toBeDefined();
  });

  it('rejects invalid NODE_ENV', () => {
    const { error } = validationSchema.validate({
      ...validEnv,
      NODE_ENV: 'staging',
    });
    expect(error).toBeDefined();
  });

  it('applies defaults for optional vars', () => {
    const result = validationSchema.validate(validEnv);
    expect(result.error).toBeUndefined();
    const env = result.value as ValidatedEnv;
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.BCRYPT_COST).toBe(12);
  });
});
