import { Logger } from '@nestjs/common';

export async function runCronJob<T extends Record<string, unknown>>(
  logger: Logger,
  event: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; startedAt: Date; finishedAt: Date; durationMs: number } & T> {
  const startedAt = new Date();
  logger.log(`${event} started at ${startedAt.toISOString()}`);
  try {
    const result = await fn();
    const finishedAt = new Date();
    const payload = {
      event,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      ...result,
    };
    logger.log(JSON.stringify(payload));
    return { ok: true, startedAt, finishedAt, durationMs: payload.durationMs, ...result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error(`${event} failed: ${message}`);
    throw e;
  }
}
