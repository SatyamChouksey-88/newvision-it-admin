/**
 * Long-running API health soak (Windows Node / libuv stability).
 * Usage: node scripts/api-soak.mjs
 * Env: SOAK_MS (default 7200000 = 2h), SOAK_INTERVAL_MS (default 30000)
 */
const url = process.env.SOAK_URL ?? 'http://localhost:3000/api/health';
const totalMs = Number(process.env.SOAK_MS ?? 7_200_000);
const intervalMs = Number(process.env.SOAK_INTERVAL_MS ?? 30_000);
const started = Date.now();
let ok = 0;
let fail = 0;

async function ping() {
  const t0 = performance.now();
  try {
    const res = await fetch(url);
    const ms = Math.round(performance.now() - t0);
    if (res.ok) {
      ok += 1;
      console.log(JSON.stringify({ t: new Date().toISOString(), ok: true, ms }));
    } else {
      fail += 1;
      console.error(JSON.stringify({ t: new Date().toISOString(), ok: false, status: res.status, ms }));
    }
  } catch (e) {
    fail += 1;
    console.error(
      JSON.stringify({
        t: new Date().toISOString(),
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}

console.log(JSON.stringify({ event: 'soak_start', url, totalMs, intervalMs }));
while (Date.now() - started < totalMs) {
  await ping();
  await new Promise((r) => setTimeout(r, intervalMs));
}
console.log(
  JSON.stringify({
    event: 'soak_end',
    elapsedMs: Date.now() - started,
    ok,
    fail,
    exit: fail > 0 ? 1 : 0,
  }),
);
process.exit(fail > 0 ? 1 : 0);
