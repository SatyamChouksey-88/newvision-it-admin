import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../common/rbac/rbac.module';
import { CustomRolesController } from './custom-roles.controller';
import { CustomRolesService } from './custom-roles.service';

@Module({
  imports: [AuditModule, RbacModule],
  controllers: [CustomRolesController],
  providers: [CustomRolesService],
  exports: [CustomRolesService],
})
export class CustomRolesModule {}
