import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/** Simple per-user upload throttle for import jobs (Phase 10). */
@Injectable()
export class ImportRateLimitService {
  private readonly windowMs = 60_000;
  private readonly maxPerWindow = 12;
  private readonly hits = new Map<number, number[]>();

  assertUploadAllowed(userId: number) {
    const now = Date.now();
    const prev = (this.hits.get(userId) ?? []).filter((t) => now - t < this.windowMs);
    if (prev.length >= this.maxPerWindow) {
      throw new HttpException('Too many import uploads — try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
    }
    prev.push(now);
    this.hits.set(userId, prev);
  }
}
