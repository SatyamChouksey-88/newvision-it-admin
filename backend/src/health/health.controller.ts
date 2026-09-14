import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { hostingRegion, residencyNote } from '../common/hosting';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { runUnscoped } from '../tenancy/context';

@Public()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    try {
      await runUnscoped(() => this.prisma.$queryRaw`SELECT 1`);
      const region = hostingRegion();
      return {
        ok: true,
        db: 'up',
        region,
        residency: residencyNote(region),
      };
    } catch {
      throw new ServiceUnavailableException({
        ok: false,
        db: 'down',
        region: hostingRegion(),
        residency: residencyNote(),
      });
    }
  }
}
