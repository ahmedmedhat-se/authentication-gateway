import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok';
}

export interface ReadinessStatus {
  status: 'ok' | 'error';
  checks: {
    database: 'up' | 'down';
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  live(): HealthStatus {
    return { status: 'ok' };
  }

  async ready(): Promise<ReadinessStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', checks: { database: 'up' } };
    } catch {
      return { status: 'error', checks: { database: 'down' } };
    }
  }
}
