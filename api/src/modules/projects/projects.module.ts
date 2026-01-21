import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { FilesystemModule } from '../filesystem/filesystem.module';
import { MemoryModule } from '../memory/memory.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [FilesystemModule, MemoryModule, ChatModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
