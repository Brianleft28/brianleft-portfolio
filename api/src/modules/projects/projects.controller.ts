import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto, UpdateProjectDto } from './projects.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UserId } from '../../decorators/current-user.decorator';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos los proyectos del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de proyectos con resúmenes' })
  async listProjects(@UserId() userId: number) {
    return this.projectsService.listProjects(userId);
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener proyecto por slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Proyecto encontrado' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getProject(@Param('slug') slug: string, @UserId() userId: number) {
    const project = await this.projectsService.getProject(slug, userId);
    if (!project) {
      throw new NotFoundException(`Proyecto "${slug}" no encontrado`);
    }
    return project;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear proyecto con retroalimentación de memoria' })
  @ApiResponse({
    status: 201,
    description: 'Proyecto creado. Actualiza memory.md, index.md y crea memoria específica',
  })
  async createProject(@Body() dto: CreateProjectDto, @UserId() userId: number) {
    return this.projectsService.createProject(dto, userId);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar título, contenido, resumen o keywords de un proyecto' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Proyecto actualizado' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async updateProject(
    @Param('slug') slug: string,
    @Body() dto: UpdateProjectDto,
    @UserId() userId: number,
  ) {
    return this.projectsService.updateProject(slug, dto, userId);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un proyecto, su archivo en el filesystem y sus keywords' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Proyecto eliminado' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async deleteProject(@Param('slug') slug: string, @UserId() userId: number) {
    return this.projectsService.deleteProject(slug, userId);
  }
}
