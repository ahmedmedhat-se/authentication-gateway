import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly handler = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  use(req: Request, res: Response, next: NextFunction): void {
    this.handler(req, res, next);
  }
}
