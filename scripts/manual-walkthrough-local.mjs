/**
 * Local manual walkthrough helper — exercises the same flows as docs/TECHNICAL_REFERENCE.md#manual-walkthrough-local-sign-off
 * against :3000 API (seeded newvision). Logs observations to stdout; no fabrication.
 */
const API = 'http://localhost:3000/api';

async function json(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function login(email) {
  const r = await json('POST', '/auth/login', {
    body: { email, password: 'Password123!' },
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.access_token;
}

async function followRedirect(pathOrUrl) {
  const origin = 'http://localhost:3000';
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${origin}${pathOrUrl}`;
  const res = await fetch(url, { redirect: 'manual' });
  const loc = res.headers.get('location');
  if (!loc) return null;
  return loc.startsWith('http') ? loc : `${origin}${loc}`;
}

async function entraJit() {
  let next = await followRedirect(
    `${API}/auth/entra/login?login_hint=${encodeURIComponent('jit.newhire@newvision.local')}`,
  );
  if (!next) throw new Error('entra login: no redirect');
  next = await followRedirect(next);
  if (!next) throw new Error('mock authorize: no redirect');
  next = await followRedirect(next);
  if (!next) throw new Error('entra callback: no redirect');
  const handoff = new URL(next).searchParams.get('handoff');
  const ex = await json('POST', '/auth/entra/exchange', { body: { handoff } });
  return { handoff: Boolean(handoff), exchangeStatus: ex.status, user: ex.data?.user };
}

async function main() {
  const out = [];
  const log = (line) => {
    out.push(line);
    console.log(line);
  };

  log('=== Manual walkthrough (API-assisted) ' + new Date().toISOString() + ' ===');

  const health = await fetch(`${API}/health`);
  log(`Health: ${health.status}`);

  const entra = await entraJit();
  log(`Mock Microsoft JIT: exchange ${entra.exchangeStatus}, email ${entra.user?.email}, role ${entra.user?.role}`);

  const superToken = await login('itadmin@newvision.local');
  const customRole = await json('POST', '/custom-roles', {
    token: superToken,
    body: {
      key: `walkthrough_${Date.now()}`,
      label: 'Walkthrough read assets',
      permissions: ['asset:read'],
    },
  });
  log(`Super Admin created custom role: HTTP ${customRole.status}`);

  const readerEmail = `walk.reader.${Date.now()}@newvision.local`;
  const userCreate = await json('POST', '/users', {
    token: superToken,
    body: {
      email: readerEmail,
      fullName: 'Walkthrough Reader',
      role: 'EMPLOYEE',
      password: 'Password123!',
    },
  });
  const assignRole = await json('PUT', `/users/${userCreate.data?.id}`, {
    token: superToken,
    body: { customRoleId: customRole.data?.id },
  });
  log(`Created user HTTP ${userCreate.status}; assigned custom role HTTP ${assignRole.status}`);

  const readerToken = await login(readerEmail);
  const canList = await json('GET', '/assets?_start=0&_end=1', { token: readerToken });
  const cannotCreate = await json('POST', '/assets', {
    token: readerToken,
    body: {
      assetCode: `WT-${Date.now()}`,
      name: 'Should fail',
      categoryId: 1,
      locationId: 1,
      status: 'available',
    },
  });
  log(`Custom role API: GET assets ${canList.status}, POST assets ${cannotCreate.status} (expect 200, 403)`);

  const empToken = await login('employee@newvision.local');
  const ticket = await json('POST', '/support-tickets', {
    token: empToken,
    body: { subject: `Walkthrough UI ticket ${Date.now()}`, description: 'Keyboard stuck', category: 'hardware' },
  });
  log(`Employee raised ticket via API (UI equivalent): HTTP ${ticket.status}, id ${ticket.data?.id}`);

  const threadId = `<walk-${Date.now()}@mail.test>`;
  const ingest1 = await json('POST', '/email-in/ingest', {
    body: {
      from: 'employee@newvision.local',
      subject: 'Email walkthrough issue',
      text: 'My laptop will not charge.',
      messageId: threadId,
    },
  });
  const ingest2 = await json('POST', '/email-in/ingest', {
    body: {
      from: 'employee@newvision.local',
      subject: 'Re: Email walkthrough issue',
      text: 'Update: tried another cable.',
      messageId: `<reply-${Date.now()}@mail.test>`,
      inReplyTo: threadId,
      references: threadId,
    },
  });
  log(`Email-in ingest: new ${ingest1.status}, reply ${ingest2.status}, ticketId ${ingest2.data?.ticketId ?? ingest1.data?.ticketId}`);

  const adminToken = await login('itadmin@newvision.local');
  const cycle = await json('POST', '/audit-cycles', {
    token: adminToken,
    body: { name: `Walkthrough cycle ${Date.now()}`, locationId: 1 },
  });
  const start = await json('POST', `/audit-cycles/${cycle.data?.id}/start`, { token: adminToken });
  const assets = await json('GET', '/assets?_start=0&_end=5&q=&status=available', { token: adminToken });
  const asset = assets.data?.data?.[0];
  const wrongLoc = await json('POST', `/assets/${asset?.id}/stamp-audit`, {
    token: adminToken,
    body: { locationId: asset?.locationId === 1 ? 2 : 1, note: 'Walkthrough scan mismatch' },
  });
  log(`Audit cycle start ${start.status}; stamp-audit exception path HTTP ${wrongLoc.status}`);

  log('=== End ===');
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
