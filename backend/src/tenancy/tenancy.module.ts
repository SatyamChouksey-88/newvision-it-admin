import { Global, Module } from '@nestjs/common';
import { PlatformTenantsController, TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

@Global()
@Module({
  controllers: [TenantController, PlatformTenantsController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenancyModule {}
