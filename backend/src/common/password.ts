import { BadRequestException } from '@nestjs/common';

/** Minimum length for any password that is *set* (create, change, reset). Login does not use this. */
export const MIN_PASSWORD_LENGTH = 12;

export function assertPasswordStrong(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
}
