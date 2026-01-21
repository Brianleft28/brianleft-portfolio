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

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@ApiTags('memories')
@Controller('memories')
export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las memorias' })
  @ApiQuery({ name: 'type', required: false, enum: MemoryType })
  @ApiResponse({ status: 200, description: 'Lista de memorias' })
  async findAll(@Query('type') type?: MemoryType) {
    if (type) {
      return this.memoryService.findByType(type);
    }
    return this.memoryService.findAll();
  }

  @Get('summaries')
  @ApiOperation({ summary: 'Obtener resúmenes de proyectos' })
  @ApiResponse({ status: 200, description: 'Lista de resúmenes' })
  async getSummaries() {
    return this.memoryService.getProjectSummaries();
  }

  @Get('relevant')
  @ApiOperation({ summary: 'Buscar memorias relevantes para un prompt' })
  @ApiQuery({ name: 'prompt', required: true })
  @ApiResponse({ status: 200, description: 'Memorias relevantes' })
  async findRelevant(@Query('prompt') prompt: string) {
    return this.memoryService.findRelevant(prompt);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener memoria por slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Memoria encontrada' })
  @ApiResponse({ status: 404, description: 'Memoria no encontrada' })
  async findBySlug(@Param('slug') slug: string) {
    return this.memoryService.findBySlug(slug);
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
  async create(@Body() dto: CreateMemoryDto) {
    return this.memoryService.create(dto);
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
  ) {
    return this.memoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar memoria (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Memoria eliminada' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.memoryService.delete(id);
    return { message: 'Memoria eliminada correctamente' };
  }
}
