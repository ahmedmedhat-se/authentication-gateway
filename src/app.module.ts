import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { HasherModule } from './hasher/hasher.module';
import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { AuditModule } from './audit/audit.module';
import { MailerModule } from './mailer/mailer.module';
import { RoleModule } from './role/role.module';
import { HealthModule } from './health/health.module';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      cache: true,
    }),
    PrismaModule,
    HasherModule,
    UserModule,
    TokenModule,
    AuditModule,
    MailerModule,
    RoleModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}
