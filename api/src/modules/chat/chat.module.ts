import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { RateLimitService } from './rate-limit.service';
import { MemoryModule } from '../memory/memory.module';
import { AiPersonalitiesModule } from '../ai-personalities/ai-personalities.module';
import { SettingsModule } from '../settings/settings.module';
import { Setting } from '../../entities/setting.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Setting]),
    MemoryModule,
    AiPersonalitiesModule,
    // Para la tarjeta de contacto cuando se agota el free tier.
    SettingsModule,
    // Sólo para verificar el JWT del dueño y saltearle el límite.
    JwtModule.register({}),
  ],
  controllers: [ChatController],
  providers: [ChatService, RateLimitService],
  exports: [ChatService, RateLimitService],
})
export class ChatModule {}
