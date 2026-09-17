import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../users/user.module';
import { HasherModule } from '../hasher/hasher.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [UserModule, HasherModule, TokenModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
