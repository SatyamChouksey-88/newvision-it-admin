import { Module } from '@nestjs/common';
import { AuthModule } from '../auth.module';
import { MockIdpModule } from '../mock-idp/mock-idp.module';
import { EntraController } from './entra.controller';
import { EntraService } from './entra.service';
import { EntraStateStore } from './entra-state-store';

@Module({
  imports: [AuthModule, MockIdpModule],
  controllers: [EntraController],
  providers: [EntraService, EntraStateStore],
})
export class EntraModule {}
