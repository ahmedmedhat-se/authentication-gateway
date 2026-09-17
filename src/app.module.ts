import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { HasherModule } from './hasher/hasher.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      cache: true,
    }),
    HasherModule,
  ],
})
export class AppModule {}
