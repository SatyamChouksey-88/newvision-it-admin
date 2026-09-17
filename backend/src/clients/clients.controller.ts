import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { ClientsService } from './clients.service';
import { AssignEmployeeClientDto, CreateClientDto, CreateVdiDto, UpdateClientDto } from './dto';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Get()
  list(@Query() query: ListQuery) {
    return this.clients.listClients(query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  create(@Body() dto: CreateClientDto, @CurrentUser() user: AuthUser) {
    return this.clients.createClient(dto, user);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.clients.updateClient(id, dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT)
  @Get('vdi')
  listVdi(@Query('clientId') clientId?: string) {
    const id = clientId ? Number(clientId) : undefined;
    return this.clients.listVdi(id && !Number.isNaN(id) ? id : undefined);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('vdi')
  createVdi(@Body() dto: CreateVdiDto) {
    return this.clients.createVdi(dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post('assignments')
  assign(@Body() dto: AssignEmployeeClientDto) {
    return this.clients.assignEmployee(dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN, RoleName.IT_SUPPORT, RoleName.MANAGER)
  @Get('reports/tickets-by-client')
  ticketSummary() {
    return this.clients.ticketSummary();
  }
}
