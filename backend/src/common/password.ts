import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/** Minimum length for any password that is *set* (create, change, reset). Login does not use this. */
export const MIN_PASSWORD_LENGTH = 12;

export function assertPasswordStrong(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new BadRequestException(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
}

let dummyHash: string | null = null;

/** bcrypt hash used on unknown-email login so the timing matches a real compare. */
export async function dummyPasswordHash(): Promise<string> {
  dummyHash ??= await bcrypt.hash('__nv-dummy-never-used__', 10);
  return dummyHash;
}
