import { Module } from '@nestjs/common';
import { ImportExportModule } from '../import-export/import-export.module';
import { ImportJobsController } from './import-jobs.controller';
import { ImportJobsService } from './import-jobs.service';

@Module({
  imports: [ImportExportModule],
  controllers: [ImportJobsController],
  providers: [ImportJobsService],
  exports: [ImportJobsService],
})
export class ImportJobsModule {}
