import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FilesystemService } from './filesystem.service';
import { CreateFolderDto, CreateFileDto, UpdateFileDto } from './dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard, ROLES_KEY } from '../../guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities/user.entity';

// Decorator para roles
const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@ApiTags('filesystem')
@Controller('filesystem')
export class FilesystemController {
  constructor(private filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener árbol completo del filesystem' })
  @ApiResponse({ status: 200, description: 'Árbol de carpetas y archivos' })
  async getTree() {
    return this.filesystemService.getTree();
  }

  @Get('folder/:id')
  @ApiOperation({ summary: 'Obtener carpeta por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Carpeta encontrada' })
  @ApiResponse({ status: 404, description: 'Carpeta no encontrada' })
  async getFolder(@Param('id', ParseIntPipe) id: number) {
    return this.filesystemService.getFolderById(id);
  }

  @Get('file/:id')
  @ApiOperation({ summary: 'Obtener archivo por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo encontrado' })
  @ApiResponse({ status: 404, description: 'Archivo no encontrado' })
  async getFile(@Param('id', ParseIntPipe) id: number) {
    return this.filesystemService.getFileById(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // Endpoints protegidos (solo admin)
  // ═══════════════════════════════════════════════════════════════

  @Post('folder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear carpeta (admin)' })
  @ApiResponse({ status: 201, description: 'Carpeta creada' })
  async createFolder(@Body() dto: CreateFolderDto) {
    return this.filesystemService.createFolder(dto);
  }

  @Post('file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear archivo (admin)' })
  @ApiResponse({ status: 201, description: 'Archivo creado' })
  async createFile(@Body() dto: CreateFileDto) {
    return this.filesystemService.createFile(dto);
  }

  @Patch('file/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar archivo (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo actualizado' })
  async updateFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesystemService.updateFile(id, dto);
  }

  @Delete('folder/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar carpeta (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Carpeta eliminada' })
  async deleteFolder(@Param('id', ParseIntPipe) id: number) {
    await this.filesystemService.deleteFolder(id);
    return { message: 'Carpeta eliminada correctamente' };
  }

  @Delete('file/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar archivo (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo eliminado' })
  async deleteFile(@Param('id', ParseIntPipe) id: number) {
    await this.filesystemService.deleteFile(id);
    return { message: 'Archivo eliminado correctamente' };
  }
}
