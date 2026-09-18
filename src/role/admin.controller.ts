import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RoleService, RoleWithPermissions } from './role.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RevokeRoleDto } from './dto/revoke-role.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AuditService } from '../audit/audit.service';
import { AuditEvent } from '../audit/audit-event.enum';

@Controller('admin/roles')
export class AdminController {
  constructor(
    private readonly roleService: RoleService,
    private readonly auditService: AuditService,
  ) {}

  @RequirePermission('roles:read')
  @Get()
  async list(): Promise<RoleWithPermissions[]> {
    return this.roleService.listRolesWithPermissions();
  }

  @RequirePermission('roles:assign')
  @Post('assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async assign(@Body() dto: AssignRoleDto, @Req() req: Request): Promise<void> {
    await this.roleService.assignRole(dto.userId, dto.roleName);
    await this.auditService.record({
      event: AuditEvent.ROLE_ASSIGNED,
      userId: dto.userId,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      metadata: { roleName: dto.roleName },
    });
  }

  @RequirePermission('roles:assign')
  @Post('revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Body() dto: RevokeRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    if (
      dto.roleName === 'admin' &&
      dto.userId === actor.id &&
      (await this.roleService.isLastAdmin(actor.id))
    ) {
      throw new ForbiddenException('CANNOT_REVOKE_LAST_ADMIN');
    }

    await this.roleService.revokeRole(dto.userId, dto.roleName);
    await this.auditService.record({
      event: AuditEvent.ROLE_REVOKED,
      userId: dto.userId,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      metadata: { roleName: dto.roleName },
    });
  }
}
