import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AiPersonalitiesService } from './ai-personalities.service';
import { AiPersonality } from '../../entities/ai-personality.entity';

@Controller('ai-personalities')
export class AiPersonalitiesController {
  constructor(private readonly aiPersonalitiesService: AiPersonalitiesService) {}

  /**
   * GET /ai-personalities - Lista todas las personalidades
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.aiPersonalitiesService.findAll();
  }

  /**
   * GET /ai-personalities/active - Obtiene la personalidad activa (público para el chat)
   */
  @Get('active')
  async getActive() {
    return this.aiPersonalitiesService.findActive();
  }

  /**
   * PUT /ai-personalities/active - Actualiza la personalidad activa
   */
  @Put('active')
  @UseGuards(JwtAuthGuard)
  async updateActive(@Body() data: Partial<AiPersonality>) {
    return this.aiPersonalitiesService.updateActive(data);
  }

  /**
   * GET /ai-personalities/:id - Obtiene una personalidad por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.aiPersonalitiesService.findById(id);
  }

  /**
   * POST /ai-personalities - Crea una nueva personalidad
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: Partial<AiPersonality>) {
    return this.aiPersonalitiesService.create(data);
  }

  /**
   * PUT /ai-personalities/:id - Actualiza una personalidad
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<AiPersonality>) {
    return this.aiPersonalitiesService.update(id, data);
  }

  /**
   * PUT /ai-personalities/:id/default - Establece como default
   */
  @Put(':id/default')
  @UseGuards(JwtAuthGuard)
  async setDefault(@Param('id', ParseIntPipe) id: number) {
    return this.aiPersonalitiesService.setDefault(id);
  }

  /**
   * DELETE /ai-personalities/:id - Elimina una personalidad
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.aiPersonalitiesService.delete(id);
    return { success: true, message: 'Personalidad eliminada' };
  }
}
