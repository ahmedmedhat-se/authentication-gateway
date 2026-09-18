import { SetMetadata } from '@nestjs/common';

export const REQUIRE_VERIFIED_EMAIL_KEY = 'requireVerifiedEmail';
export const RequireVerifiedEmail = (): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_VERIFIED_EMAIL_KEY, true);
