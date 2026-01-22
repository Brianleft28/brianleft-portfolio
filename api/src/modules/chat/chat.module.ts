import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MemoryModule } from '../memory/memory.module';
import { AiPersonalitiesModule } from '../ai-personalities/ai-personalities.module';
import { Setting } from '../../entities/setting.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Setting]), MemoryModule, AiPersonalitiesModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
