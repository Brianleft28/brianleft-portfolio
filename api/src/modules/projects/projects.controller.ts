import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los proyectos' })
  @ApiResponse({ status: 200, description: 'Lista de proyectos con resúmenes' })
  async listProjects() {
    return this.projectsService.listProjects();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Obtener proyecto por slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Proyecto encontrado' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getProject(@Param('slug') slug: string) {
    const project = await this.projectsService.getProject(slug);
    if (!project) {
      throw new NotFoundException(`Proyecto "${slug}" no encontrado`);
    }
    return project;
  }

  @Post()
  @ApiOperation({ summary: 'Crear proyecto con retroalimentación de memoria' })
  @ApiResponse({
    status: 201,
    description: 'Proyecto creado. Actualiza memory.md, index.md y crea memoria específica',
  })
  async createProject(@Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(dto);
  }
}
