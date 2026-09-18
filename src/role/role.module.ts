import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { AdminController } from './admin.controller';

@Module({
  controllers: [AdminController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
