import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Memory } from '../../entities/memory.entity';
import { MemoryKeyword } from '../../entities/memory-keyword.entity';
import { Setting } from '../../entities/setting.entity';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Memory, MemoryKeyword, Setting])],
  controllers: [MemoryController],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
