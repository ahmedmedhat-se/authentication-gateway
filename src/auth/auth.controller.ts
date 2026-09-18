import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  LoginResult,
  PublicUser,
  RefreshResult,
} from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequireVerifiedEmail } from './decorators/require-verified-email.decorator';
import type { AuthenticatedUser } from './types/authenticated-user';
import { RequestContext } from '../common/types/request-context';
import {
  StrictThrottle,
  AuthThrottle,
} from '../common/decorators/throttle.decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @StrictThrottle()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<PublicUser> {
    return this.authService.register(
      dto.email,
      dto.password,
      this.context(req),
    );
  }

  @Public()
  @AuthThrottle()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<LoginResult> {
    return this.authService.login(dto.email, dto.password, this.context(req));
  }

  @Public()
  @AuthThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
  ): Promise<RefreshResult> {
    return this.authService.refresh(dto.refreshToken, this.context(req));
  }

  @Public()
  @AuthThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto, @Req() req: Request): Promise<void> {
    await this.authService.logout(dto.refreshToken, this.context(req));
  }

  @Post('change-password')
  @RequireVerifiedEmail()
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
      this.context(req),
    );
  }

  @Public()
  @AuthThrottle()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<{ emailVerified: true }> {
    await this.authService.verifyEmail(dto.token, this.context(req));
    return { emailVerified: true };
  }

  @Public()
  @StrictThrottle()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto.email, this.context(req));
    return {
      message: 'If the account exists, a reset email has been sent.',
    };
  }

  @Public()
  @AuthThrottle()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.authService.resetPassword(
      dto.token,
      dto.newPassword,
      this.context(req),
    );
  }

  private context(req: Request): RequestContext {
    return {
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
