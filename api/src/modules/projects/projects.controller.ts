import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los proyectos' })
  @ApiQuery({ name: 'userId', required: false, description: 'ID del usuario (default: 1)' })
  @ApiResponse({ status: 200, description: 'Lista de proyectos con resúmenes' })
  async listProjects(@Query('userId') userId?: string) {
    return this.projectsService.listProjects(userId ? parseInt(userId, 10) : 1);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener proyecto por slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiQuery({ name: 'userId', required: false, description: 'ID del usuario (default: 1)' })
  @ApiResponse({ status: 200, description: 'Proyecto encontrado' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getProject(@Param('slug') slug: string, @Query('userId') userId?: string) {
    const project = await this.projectsService.getProject(slug, userId ? parseInt(userId, 10) : 1);
    if (!project) {
      throw new NotFoundException(`Proyecto "${slug}" no encontrado`);
    }
    return project;
  }

  @Post()
  @ApiOperation({ summary: 'Crear proyecto con retroalimentación de memoria' })
  @ApiQuery({ name: 'userId', required: false, description: 'ID del usuario (default: 1)' })
  @ApiResponse({
    status: 201,
    description: 'Proyecto creado. Actualiza memory.md, index.md y crea memoria específica',
  })
  async createProject(@Body() dto: CreateProjectDto, @Query('userId') userId?: string) {
    return this.projectsService.createProject(dto, userId ? parseInt(userId, 10) : 1);
  }
}
