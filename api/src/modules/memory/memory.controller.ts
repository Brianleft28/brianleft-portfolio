import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import { CreateMemoryDto, UpdateMemoryDto } from './dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../../guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';
import { MemoryType } from '../../entities/memory.entity';
import { UserId } from '../../decorators';

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@ApiTags('memories')
@Controller('memories')
export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las memorias' })
  @ApiQuery({ name: 'type', required: false, enum: MemoryType })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de memorias' })
  async findAll(@Query('type') type?: MemoryType, @Query('userId') userId?: number) {
    // Para acceso público, usar userId=1 (admin) por defecto
    const targetUserId = userId || 1;
    if (type) {
      return this.memoryService.findByType(type, targetUserId);
    }
    return this.memoryService.findAll(targetUserId);
  }

  @Get('summaries')
  @ApiOperation({ summary: 'Obtener resúmenes de proyectos' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de resúmenes' })
  async getSummaries(@Query('userId') userId?: number) {
    return this.memoryService.getProjectSummaries(userId || 1);
  }

  @Get('relevant')
  @ApiOperation({ summary: 'Buscar memorias relevantes para un prompt' })
  @ApiQuery({ name: 'prompt', required: true })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Memorias relevantes' })
  async findRelevant(@Query('prompt') prompt: string, @Query('userId') userId?: number) {
    return this.memoryService.findRelevant(prompt, userId || 1);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener memoria por slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Memoria encontrada' })
  @ApiResponse({ status: 404, description: 'Memoria no encontrada' })
  async findBySlug(@Param('slug') slug: string, @Query('userId') userId?: number) {
    return this.memoryService.findBySlug(slug, userId || 1);
  }

  // ═══════════════════════════════════════════════════════════════
  // Endpoints protegidos (solo admin)
  // ═══════════════════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear memoria (admin)' })
  @ApiResponse({ status: 201, description: 'Memoria creada' })
  async create(@Body() dto: CreateMemoryDto, @UserId() userId: number) {
    return this.memoryService.create(dto, userId);
  }

  @Post('generate-summaries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar resúmenes faltantes con IA (admin)' })
  @ApiResponse({ status: 200, description: 'Resúmenes generados' })
  async generateSummaries(@UserId() userId: number) {
    return this.memoryService.generateMissingSummaries(userId);
  }

  @Post('project')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear proyecto con retroalimentación de memoria (admin)' })
  @ApiResponse({ status: 201, description: 'Proyecto creado con summary y keywords' })
  async createProject(
    @Body() dto: { title: string; slug: string; content: string },
    @UserId() userId: number,
  ) {
    return this.memoryService.createProjectWithFeedback(dto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar memoria (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Memoria actualizada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMemoryDto,
    @UserId() userId: number,
  ) {
    return this.memoryService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar memoria (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Memoria eliminada' })
  async delete(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    await this.memoryService.delete(id, userId);
    return { message: 'Memoria eliminada correctamente' };
  }
}
