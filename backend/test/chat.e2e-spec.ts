import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Prompt 24 — Teams-style staff chat (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: string;
  let support: string;
  let superTok: string;
  let manager: string;
  let employee: string;
  let adminId: number;
  let supportId: number;
  let superId: number;
  let baseUrl: string;

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
    baseUrl = await app.getUrl();
    prisma = app.get(PrismaService);
    await seedCore(prisma);
    admin = await login(app, 'itadmin@newvision.local');
    support = await login(app, 'support@newvision.local');
    superTok = await login(app, 'superadmin@newvision.local');
    manager = await login(app, 'manager@newvision.local');
    employee = await login(app, 'employee@newvision.local');
    adminId = (await prisma.user.findUniqueOrThrow({ where: { email: 'itadmin@newvision.local' } }))
      .id;
    supportId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'support@newvision.local' } })
    ).id;
    superId = (
      await prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@newvision.local' } })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects Managers and Employees at the API layer', async () => {
    await request(app.getHttpServer()).get('/api/chat/channels').set(auth(manager)).expect(403);
    await request(app.getHttpServer()).get('/api/chat/unread').set(auth(employee)).expect(403);
    await request(app.getHttpServer())
      .post('/api/chat/dm')
      .set(auth(manager))
      .send({ userId: adminId })
      .expect(403);
  });

  it('seeds default channels, DMs, groups, threads, reactions, mentions, unread, attachments, unfurl, presence', async () => {
    const channels = await request(app.getHttpServer())
      .get('/api/chat/channels')
      .set(auth(admin))
      .expect(200);
    const names = (channels.body as { name: string }[]).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['#it-ops', '#helpdesk', '#procurement']));
    const itOps = (channels.body as { id: number; name: string }[]).find(
      (c) => c.name === '#it-ops',
    );
    expect(itOps).toBeTruthy();

    const created = await request(app.getHttpServer())
      .post('/api/chat/channels')
      .set(auth(admin))
      .send({
        name: 'war-room',
        description: 'Incidents',
        visibility: 'private',
        memberIds: [supportId],
      })
      .expect(201);
    expect(created.body.name).toBe('#war-room');

    const dm = await request(app.getHttpServer())
      .post('/api/chat/dm')
      .set(auth(admin))
      .send({ userId: supportId })
      .expect(201);
    const dm2 = await request(app.getHttpServer())
      .post('/api/chat/dm')
      .set(auth(support))
      .send({ userId: adminId })
      .expect(201);
    expect(dm2.body.id).toBe(dm.body.id);

    const group = await request(app.getHttpServer())
      .post('/api/chat/group')
      .set(auth(admin))
      .send({ userIds: [supportId, superId], name: 'Pune desk' })
      .expect(201);
    expect(group.body.type).toBe('group');

    const posted = await request(app.getHttpServer())
      .post(`/api/chat/channels/${itOps!.id}/messages`)
      .set(auth(admin))
      .send({
        body: `Checking TCK-000001 and AST-PUN-0001 — [@Sunil Support](mention:${supportId}) @channel`,
      })
      .expect(201);
    expect(posted.body.mentions.some((m: { kind: string }) => m.kind === 'user')).toBe(true);
    expect(posted.body.mentions.some((m: { kind: string }) => m.kind === 'channel')).toBe(true);
    expect(posted.body.links.some((l: { kind: string }) => l.kind === 'ticket')).toBe(true);
    expect(posted.body.links.some((l: { kind: string }) => l.kind === 'asset')).toBe(true);

    const mentionNote = await prisma.notification.findFirst({
      where: { userId: supportId, type: 'chat_mention' },
      orderBy: { id: 'desc' },
    });
    expect(mentionNote?.link).toContain(`/chat?c=${itOps!.id}&m=${posted.body.id}`);

    const edited = await request(app.getHttpServer())
      .patch(`/api/chat/messages/${posted.body.id}`)
      .set(auth(admin))
      .send({ body: 'Edited — still **bold**' })
      .expect(200);
    expect(edited.body.editedAt).toBeTruthy();

    const thread = await request(app.getHttpServer())
      .post(`/api/chat/channels/${itOps!.id}/messages`)
      .set(auth(support))
      .send({ body: 'On it', parentId: posted.body.id })
      .expect(201);
    expect(thread.body.parentId).toBe(posted.body.id);

    const threadView = await request(app.getHttpServer())
      .get(`/api/chat/channels/${itOps!.id}/messages/${posted.body.id}/thread`)
      .set(auth(admin))
      .expect(200);
    expect(threadView.body.replies.length).toBeGreaterThanOrEqual(1);

    const reacted = await request(app.getHttpServer())
      .post(`/api/chat/messages/${posted.body.id}/reactions`)
      .set(auth(support))
      .send({ emoji: '👍' })
      .expect(201);
    expect(
      reacted.body.reactions.some((r: { emoji: string; mine: boolean }) => r.emoji === '👍'),
    ).toBe(true);
    await request(app.getHttpServer())
      .post(`/api/chat/messages/${posted.body.id}/reactions`)
      .set(auth(support))
      .send({ emoji: '👍' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/chat/channels/${itOps!.id}/read`)
      .set(auth(admin))
      .expect(201);
    const unread = await request(app.getHttpServer())
      .get('/api/chat/unread')
      .set(auth(admin))
      .expect(200);
    expect(typeof unread.body.unread).toBe('number');

    const attach = await request(app.getHttpServer())
      .post(`/api/chat/channels/${dm.body.id}/messages`)
      .set(auth(admin))
      .field('body', 'screenshot')
      .attach('files', Buffer.from('png-bytes'), { filename: 'snip.png', contentType: 'image/png' })
      .expect(201);
    expect(attach.body.attachments[0].image).toBe(true);
    await request(app.getHttpServer())
      .get(`/api/chat/attachments/${attach.body.attachments[0].id}`)
      .set(auth(support))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/chat/channels/${dm.body.id}/messages`)
      .set(auth(admin))
      .attach('files', Buffer.from('MZ'), {
        filename: 'virus.exe',
        contentType: 'application/octet-stream',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/chat/channels/${dm.body.id}/messages`)
      .set(auth(admin))
      .field('body', 'word-doc')
      .attach('files', Buffer.from('PK'), {
        filename: 'brief.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/chat/channels/${dm.body.id}/messages`)
      .set(auth(admin))
      .field('body', 'legacy-doc')
      .attach('files', Buffer.from('DOC'), {
        filename: 'legacy.doc',
        contentType: 'application/msword',
      })
      .expect(201);

    const deleted = await request(app.getHttpServer())
      .delete(`/api/chat/messages/${posted.body.id}`)
      .set(auth(superTok))
      .expect(200);
    expect(deleted.body.deleted).toBe(true);

    const ping = await request(app.getHttpServer())
      .post('/api/chat/presence/ping')
      .set(auth(admin))
      .expect(201);
    expect(['available', 'away', 'busy', 'dnd', 'offline']).toContain(ping.body.status);

    const found = await request(app.getHttpServer())
      .get('/api/chat/search')
      .query({ q: 'Edited' })
      .set(auth(admin))
      .expect(200);
    expect(Array.isArray(found.body)).toBe(true);
  });

  it('delivers a message over the websocket to another staff session', async () => {
    const channels = await request(app.getHttpServer())
      .get('/api/chat/channels')
      .set(auth(admin))
      .expect(200);
    const itOps = (channels.body as { id: number; name: string }[]).find(
      (c) => c.name === '#it-ops',
    );
    expect(itOps).toBeTruthy();

    const sock: Socket = ioClient(`${baseUrl}/chat`, {
      auth: { token: support },
      transports: ['websocket'],
      reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('socket connect timeout')), 8000);
      sock.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      sock.on('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    const received = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for message:new')), 8000);
      sock.on('message:new', (payload: { body?: string; channelId?: number }) => {
        if (payload.channelId === itOps!.id && payload.body?.includes('socket-ping')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    await request(app.getHttpServer())
      .post(`/api/chat/channels/${itOps!.id}/messages`)
      .set(auth(admin))
      .send({ body: 'socket-ping from admin' })
      .expect(201);
    await received;
    sock.close();
  });
});
