import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/** Global search across asset code, serial number, employee name/ID, model, location. */
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 1) {
      return { assets: [], employees: [], locations: [], query: term };
    }
    const like = { contains: term, mode: 'insensitive' as const };

    const [assets, employees, locations] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          OR: [{ assetCode: like }, { serialNumber: like }, { model: like }, { brand: like }],
        },
        include: { category: true, location: true, assignedEmployee: true },
        take: 20,
      }),
      this.prisma.employee.findMany({
        where: {
          OR: [{ firstName: like }, { lastName: like }, { email: like }, { employeeCode: like }],
        },
        include: { location: true, department: true },
        take: 20,
      }),
      this.prisma.location.findMany({
        where: { OR: [{ name: like }, { code: like }, { city: like }] },
        take: 10,
      }),
    ]);

    return { query: term, assets, employees, locations };
  }
}
