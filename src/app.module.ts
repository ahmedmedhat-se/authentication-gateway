import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { HasherModule } from './hasher/hasher.module';
import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
import { TokenModule } from './token/token.module';
import { AuditModule } from './audit/audit.module';
import { MailerModule } from './mailer/mailer.module';

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
    AuthModule,
  ],
})
export class AppModule {}
