import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { verifyWebhookSignature } from '../src/webhooks/signature';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore, TestContext } from './helpers';

describe('Phase 4 — QR scan page & webhooks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: TestContext['ids'];
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    ids = await seedCore(prisma);
    adminToken = await login(app, 'itadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('returns a PNG QR for an asset and a public scan card without auth', async () => {
    const created = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationPune, brand: 'Dell', model: 'ScanMe' })
      .expect(201);

    const qr = await request(server())
      .get(`/api/assets/${created.body.id}/qr`)
      .set(auth(adminToken))
      .buffer(true)
      .expect(200);
    expect(qr.headers['content-type']).toContain('image/png');
    expect(qr.body.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');

    const publicQr = await request(server())
      .get(`/api/public/assets/${created.body.assetCode}/qr`)
      .buffer(true)
      .expect(200);
    expect(publicQr.headers['content-type']).toContain('image/png');

    const card = await request(server()).get(`/api/public/assets/${created.body.assetCode}`).expect(200);
    expect(card.body.assetCode).toBe(created.body.assetCode);
    expect(card.body.status).toBe('available');
    expect(card.body).not.toHaveProperty('purchaseCost');
  });

  it('delivers a signed asset.created webhook to a live HTTP endpoint', async () => {
    const received: { headers: http.IncomingHttpHeaders; body: string }[] = [];
    const hookServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        received.push({ headers: req.headers, body: Buffer.concat(chunks).toString('utf8') });
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      });
    });
    await new Promise<void>((r) => hookServer.listen(0, '127.0.0.1', r));
    const port = (hookServer.address() as AddressInfo).port;

    const hook = await request(server())
      .post('/api/webhooks')
      .set(auth(adminToken))
      .send({
        url: `http://127.0.0.1:${port}/hook`,
        secret: 'phase4-secret',
        events: ['asset.created', 'asset.status_changed'],
      })
      .expect(201);
    expect(hook.body.secret).toBe('phase4-secret');

    const created = await request(server())
      .post('/api/assets')
      .set(auth(adminToken))
      .send({ categoryId: ids.categoryLap, locationId: ids.locationHyd, brand: 'Hook' })
      .expect(201);

    expect(received.length).toBe(1);
    const payload = JSON.parse(received[0].body);
    expect(payload.event).toBe('asset.created');
    expect(payload.data.assetCode).toBe(created.body.assetCode);
    expect(
      verifyWebhookSignature('phase4-secret', received[0].body, String(received[0].headers['x-newvision-signature'])),
    ).toBe(true);

    await request(server())
      .post(`/api/assets/${created.body.id}/status`)
      .set(auth(adminToken))
      .send({ status: 'retired' })
      .expect(201);
    expect(received.length).toBe(2);
    expect(JSON.parse(received[1].body).event).toBe('asset.status_changed');

    hookServer.close();
    await request(server()).delete(`/api/webhooks/${hook.body.id}`).set(auth(adminToken)).expect(200);
  });

  it('forbids an Employee from managing webhooks', async () => {
    const employeeToken = await login(app, 'employee@newvision.local');
    await request(server())
      .post('/api/webhooks')
      .set(auth(employeeToken))
      .send({ url: 'http://example.test/h', events: ['asset.created'] })
      .expect(403);
  });

  it('rejects an unknown webhook event name', async () => {
    await request(server())
      .post('/api/webhooks')
      .set(auth(adminToken))
      .send({ url: 'http://example.test/h', events: ['asset.deleted'] })
      .expect(400);
  });
});
