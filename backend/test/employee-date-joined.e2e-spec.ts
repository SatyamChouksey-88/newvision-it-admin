import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { auth, createTestApp, login, seedCore } from './helpers';

describe('Employee dateJoined (create honesty)', () => {
  let app: INestApplication;
  let adminToken: string;
  let locationId: number;

  beforeAll(async () => {
    app = await createTestApp();
    const ids = await seedCore(app.get(PrismaService));
    locationId = ids.locationPune;
    adminToken = await login(app, 'itadmin@newvision.local');
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('rejects POST /employees without dateJoined', async () => {
    const res = await request(server())
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: 'EMP-NODOJ',
        firstName: 'No',
        lastName: 'Doj',
        email: 'no.doj@newvision.local',
        locationId,
      })
      .expect(400);
    const msg = JSON.stringify(res.body);
    expect(msg).toMatch(/dateJoined/i);
  });

  it('saves dateJoined on create and returns it on list + get', async () => {
    const dateJoined = '2024-01-15T00:00:00.000Z';
    const created = await request(server())
      .post('/api/employees')
      .set(auth(adminToken))
      .send({
        employeeCode: 'EMP-DOJ1',
        firstName: 'Has',
        lastName: 'Doj',
        email: 'has.doj@newvision.local',
        locationId,
        dateJoined,
      })
      .expect(201);
    expect(new Date(created.body.dateJoined).toISOString().slice(0, 10)).toBe('2024-01-15');

    const listed = await request(server())
      .get('/api/employees')
      .query({ q: 'EMP-DOJ1', _start: 0, _end: 10 })
      .set(auth(adminToken))
      .expect(200);
    expect(listed.body.data).toHaveLength(1);
    expect(new Date(listed.body.data[0].dateJoined).toISOString().slice(0, 10)).toBe('2024-01-15');

    const one = await request(server())
      .get(`/api/employees/${created.body.id}`)
      .set(auth(adminToken))
      .expect(200);
    expect(new Date(one.body.dateJoined).toISOString().slice(0, 10)).toBe('2024-01-15');
  });
});
