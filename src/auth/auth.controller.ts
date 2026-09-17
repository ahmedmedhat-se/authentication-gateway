import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, PublicUser } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RequestContext } from '../common/types/request-context';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<PublicUser> {
    const ctx: RequestContext = {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
    return this.authService.register(dto.email, dto.password, ctx);
  }
}
