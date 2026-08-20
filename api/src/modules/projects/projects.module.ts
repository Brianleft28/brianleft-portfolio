import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { FilesystemModule } from '../filesystem/filesystem.module';
import { MemoryModule } from '../memory/memory.module';
import { ChatModule } from '../chat/chat.module';
import { TranslationModule } from '../translation/translation.module';
import { Memory } from '../../entities/memory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Memory]),
    FilesystemModule,
    MemoryModule,
    ChatModule,
    TranslationModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
