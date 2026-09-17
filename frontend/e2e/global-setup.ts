const HEALTH_URL =
  process.env.PLAYWRIGHT_API_HEALTH ?? 'http://localhost:3000/api/health';
const MAX_WAIT_MS = Number(process.env.PLAYWRIGHT_API_WAIT_MS ?? 120_000);
const INTERVAL_MS = 2000;

export default async function globalSetup(): Promise<void> {
  const deadline = Date.now() + MAX_WAIT_MS;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) {
        const body = (await res.json()) as { ok?: boolean; db?: string };
        if (body.ok && body.db === 'up') return;
        lastError = `health ok=false or db not up: ${JSON.stringify(body)}`;
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  throw new Error(
    `Playwright requires API at ${HEALTH_URL} (db up). Last error: ${lastError}. Start backend (e.g. docker compose up -d backend).`,
  );
}
