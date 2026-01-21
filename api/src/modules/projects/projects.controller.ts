import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService, CreateProjectDto } from './projects.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../../guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear proyecto (admin)' })
  @ApiResponse({ status: 201, description: 'Proyecto creado' })
  async createProject(@Body() dto: CreateProjectDto) {
    return this.projectsService.createProject(dto);
  }
}
