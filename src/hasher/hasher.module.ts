import { Module } from '@nestjs/common';
import { HasherService } from './hasher.service';

@Module({
  providers: [HasherService],
  exports: [HasherService],
})
export class HasherModule {}
