import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EmailVerifiedGuard } from './email-verified.guard';
import { UserService } from '../../users/user.service';
import { AuthenticatedUser } from '../types/authenticated-user';

interface MockUserService {
  findById: jest.Mock;
}

function buildContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('EmailVerifiedGuard', () => {
  let guard: EmailVerifiedGuard;
  let reflector: Reflector;
  let userService: MockUserService;

  beforeEach(() => {
    reflector = new Reflector();
    userService = { findById: jest.fn() };
    guard = new EmailVerifiedGuard(
      reflector,
      userService as unknown as UserService,
    );
  });

  it('returns true when route does not require verification', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);

    const result = await guard.canActivate(
      buildContext({ id: 'u', email: 'e', roles: [] }),
    );

    expect(result).toBe(true);
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('returns true when user email is verified', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    userService.findById.mockResolvedValue({ id: 'u', emailVerified: true });

    const result = await guard.canActivate(
      buildContext({ id: 'u', email: 'e', roles: [] }),
    );

    expect(result).toBe(true);
  });

  it('throws 403 when user email is not verified', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    userService.findById.mockResolvedValue({ id: 'u', emailVerified: false });

    await expect(
      guard.canActivate(buildContext({ id: 'u', email: 'e', roles: [] })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws 403 when user is missing from the request', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);

    await expect(
      guard.canActivate(buildContext(undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
