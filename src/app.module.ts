import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { HasherModule } from './hasher/hasher.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      cache: true,
    }),
    PrismaModule,
    HasherModule,
  ],
})
export class AppModule {}
