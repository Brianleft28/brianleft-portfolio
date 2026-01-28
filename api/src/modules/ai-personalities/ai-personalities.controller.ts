import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { AiPersonalitiesService } from './ai-personalities.service';
import { AiPersonality } from '../../entities/ai-personality.entity';
import { UserId } from '../../decorators';

@Controller('ai-personalities')
export class AiPersonalitiesController {
  constructor(private readonly aiPersonalitiesService: AiPersonalitiesService) {}

  /**
   * GET /ai-personalities - Lista todas las personalidades
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@UserId() userId: number) {
    return this.aiPersonalitiesService.findAll(userId);
  }

  /**
   * GET /ai-personalities/active - Obtiene la personalidad activa (público para el chat)
   */
  @Get('active')
  async getActive(@Query('userId') userId?: number) {
    return this.aiPersonalitiesService.findActive(userId || 1);
  }

  /**
   * PUT /ai-personalities/active - Actualiza la personalidad activa
   */
  @Put('active')
  @UseGuards(JwtAuthGuard)
  async updateActive(@Body() data: Partial<AiPersonality>, @UserId() userId: number) {
    return this.aiPersonalitiesService.updateActive(data, userId);
  }

  /**
   * GET /ai-personalities/:id - Obtiene una personalidad por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    return this.aiPersonalitiesService.findById(id, userId);
  }

  /**
   * POST /ai-personalities - Crea una nueva personalidad
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() data: Partial<AiPersonality>, @UserId() userId: number) {
    return this.aiPersonalitiesService.create(data, userId);
  }

  /**
   * PUT /ai-personalities/:id - Actualiza una personalidad
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() data: Partial<AiPersonality>,
    @UserId() userId: number,
  ) {
    return this.aiPersonalitiesService.update(id, data, userId);
  }

  /**
   * PUT /ai-personalities/:id/default - Establece como default
   */
  @Put(':id/default')
  @UseGuards(JwtAuthGuard)
  async setDefault(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    return this.aiPersonalitiesService.setDefault(id, userId);
  }

  /**
   * POST /ai-personalities/:id/activate - Activa una personalidad
   */
  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  async activate(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    return this.aiPersonalitiesService.activate(id, userId);
  }

  /**
   * DELETE /ai-personalities/:id - Elimina una personalidad
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    await this.aiPersonalitiesService.delete(id, userId);
    return { success: true, message: 'Personalidad eliminada' };
  }
}
