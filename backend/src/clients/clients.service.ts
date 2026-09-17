import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ListQuery, parseListQuery } from '../common/query';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenantId } from '../tenancy/context';
import { AssignEmployeeClientDto, CreateClientDto, CreateVdiDto, UpdateClientDto } from './dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async listClients(query: ListQuery) {
    const { skip, take, orderBy } = parseListQuery(query, ['id', 'code', 'name', 'createdAt']);
    const [data, total] = await Promise.all([
      this.prisma.clientAccount.findMany({
        skip,
        take,
        orderBy,
        include: { _count: { select: { vdiEnvironments: true, tickets: true } } },
      }),
      this.prisma.clientAccount.count(),
    ]);
    return { data, total };
  }

  async createClient(dto: CreateClientDto, _actor: AuthUser) {
    const code = dto.code.trim().toUpperCase();
    return this.prisma.clientAccount.create({
      data: {
        tenantId: requireTenantId(),
        code,
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateClient(id: number, dto: UpdateClientDto) {
    const row = await this.prisma.clientAccount.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Client ${id} not found`);
    return this.prisma.clientAccount.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        isActive: dto.isActive,
      },
    });
  }

  async listVdi(clientId?: number) {
    return this.prisma.vdiEnvironment.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { name: 'asc' },
      include: { client: { select: { id: true, code: true, name: true } } },
    });
  }

  async createVdi(dto: CreateVdiDto) {
    const client = await this.prisma.clientAccount.findUnique({ where: { id: dto.clientId } });
    if (!client?.isActive) throw new BadRequestException('Client not found or inactive');
    return this.prisma.vdiEnvironment.create({
      data: {
        tenantId: requireTenantId(),
        clientId: dto.clientId,
        name: dto.name.trim(),
        poolName: dto.poolName?.trim() || null,
      },
    });
  }

  async assignEmployee(dto: AssignEmployeeClientDto) {
    const [emp, client] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: dto.employeeId } }),
      this.prisma.clientAccount.findUnique({ where: { id: dto.clientId } }),
    ]);
    if (!emp?.isActive) throw new BadRequestException('Employee not found or inactive');
    if (!client?.isActive) throw new BadRequestException('Client not found or inactive');
    await this.prisma.employeeClientAssignment.updateMany({
      where: { employeeId: dto.employeeId, endedAt: null },
      data: { endedAt: new Date() },
    });
    return this.prisma.employeeClientAssignment.create({
      data: {
        tenantId: requireTenantId(),
        employeeId: dto.employeeId,
        clientId: dto.clientId,
      },
      include: {
        client: { select: { id: true, code: true, name: true } },
        employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
      },
    });
  }

  async ticketSummary() {
    const rows = await this.prisma.supportTicket.groupBy({
      by: ['clientId', 'status'],
      _count: { _all: true },
      where: { clientId: { not: null } },
    });
    const clients = await this.prisma.clientAccount.findMany({
      select: { id: true, code: true, name: true },
    });
    const byClient = new Map<number, Record<string, number>>();
    for (const r of rows) {
      if (r.clientId == null) continue;
      const bucket = byClient.get(r.clientId) ?? {};
      bucket[r.status] = r._count._all;
      byClient.set(r.clientId, bucket);
    }
    return clients.map((c) => ({
      client: c,
      counts: byClient.get(c.id) ?? {},
      total: Object.values(byClient.get(c.id) ?? {}).reduce((a, b) => a + b, 0),
    }));
  }
}
