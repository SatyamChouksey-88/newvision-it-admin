import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ReconciliationKind, RoleName } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ListQuery } from '../common/query';
import { ReconciliationService } from './reconciliation.service';

type Uploaded = { originalname: string; buffer: Buffer };

@ApiTags('reconciliation')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly recon: ReconciliationService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get()
  list(@Query() query: ListQuery) {
    return this.recon.list(query);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.recon.get(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.IT_ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  run(
    @UploadedFile() file: Uploaded,
    @Query('kind') kindRaw: string,
    @Query('matchField') matchFieldRaw: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded (field name must be "file")');
    const kind: ReconciliationKind = kindRaw === 'assets' ? 'assets' : 'employees';
    const matchField = matchFieldRaw || (kind === 'employees' ? 'employeeCode' : 'assetCode');
    return this.recon.run(file, kind, matchField, user);
  }
}
