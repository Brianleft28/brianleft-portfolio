import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MemoryModule } from '../memory/memory.module';
import { AiPersonalitiesModule } from '../ai-personalities/ai-personalities.module';

@Module({
  imports: [ConfigModule, MemoryModule, AiPersonalitiesModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
