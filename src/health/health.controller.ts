import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';
import type { HealthStatus, ReadinessStatus } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): HealthStatus {
    return this.healthService.live();
  }

  @Public()
  @Get('ready')
  async ready(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadinessStatus> {
    const result = await this.healthService.ready();
    if (result.status === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
