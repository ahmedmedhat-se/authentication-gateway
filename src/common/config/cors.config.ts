import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';

export function buildCorsOptions(config: ConfigService): CorsOptions {
  const originsRaw = config.get<string>('CORS_ORIGINS') ?? '';
  const origins = originsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return {
    origin: origins.length > 0 ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}
