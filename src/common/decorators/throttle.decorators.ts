import { Throttle } from '@nestjs/throttler';

const isTest = process.env.NODE_ENV === 'test';
const STRICT_LIMIT = isTest ? 1000000 : 5;
const AUTH_LIMIT = isTest ? 1000000 : 10;
const TTL = 60000;

export const StrictThrottle = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { limit: STRICT_LIMIT, ttl: TTL } });

export const AuthThrottle = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { limit: AUTH_LIMIT, ttl: TTL } });
