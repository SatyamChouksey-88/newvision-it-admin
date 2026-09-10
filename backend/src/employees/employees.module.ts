import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChecklistsController } from './checklists.controller';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [AuthModule],
  controllers: [EmployeesController, ChecklistsController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
