import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiPersonality } from '../../entities/ai-personality.entity';
import { AiPersonalitiesController } from './ai-personalities.controller';
import { AiPersonalitiesService } from './ai-personalities.service';

@Module({
  imports: [TypeOrmModule.forFeature([AiPersonality])],
  controllers: [AiPersonalitiesController],
  providers: [AiPersonalitiesService],
  exports: [AiPersonalitiesService],
})
export class AiPersonalitiesModule {}
