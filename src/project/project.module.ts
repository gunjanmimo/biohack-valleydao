import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectService } from './service/project.service';
import { Project } from './schema/project.schema';
@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
