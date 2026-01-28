import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FilesystemService } from './filesystem.service';
import { CreateFolderDto, CreateFileDto, UpdateFileDto } from './dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UserId } from '../../decorators';

@ApiTags('filesystem')
@Controller('filesystem')
export class FilesystemController {
  constructor(private filesystemService: FilesystemService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener árbol completo del filesystem (público - usa userId por defecto)' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Árbol de carpetas y archivos' })
  async getTree(@Query('userId') userId?: number) {
    // Para acceso público, usar userId=1 (admin) por defecto
    return this.filesystemService.getTree(userId || 1);
  }

  @Get('folders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas las carpetas (flat list)' })
  @ApiResponse({ status: 200, description: 'Lista de carpetas con paths' })
  async getAllFolders(@UserId() userId: number) {
    return this.filesystemService.getAllFolders(userId);
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

  @Post('folder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear carpeta' })
  @ApiResponse({ status: 201, description: 'Carpeta creada' })
  async createFolder(@Body() dto: CreateFolderDto, @UserId() userId: number) {
    return this.filesystemService.createFolder(dto, userId);
  }

  @Post('file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear archivo' })
  @ApiResponse({ status: 201, description: 'Archivo creado' })
  async createFile(@Body() dto: CreateFileDto, @UserId() userId: number) {
    return this.filesystemService.createFile(dto, userId);
  }

  @Patch('file/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar archivo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo actualizado' })
  async updateFile(
    @Param('id', ParseIntPipe) id: number, 
    @Body() dto: UpdateFileDto,
    @UserId() userId: number,
  ) {
    return this.filesystemService.updateFile(id, dto, userId);
  }

  @Delete('folder/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar carpeta y memorias asociadas' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Carpeta y memorias eliminadas' })
  async deleteFolder(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    const result = await this.filesystemService.deleteFolder(id, userId);
    return { 
      message: 'Carpeta eliminada correctamente',
      ...result
    };
  }

  @Delete('file/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar archivo y memoria asociada' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo y memoria eliminados' })
  async deleteFile(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    const result = await this.filesystemService.deleteFile(id, userId);
    return { 
      message: 'Archivo eliminado correctamente',
      ...result
    };
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sincronizar filesystem con proyectos de memoria' })
  @ApiResponse({ status: 200, description: 'Sincronización completada' })
  async syncWithProjects(@UserId() userId: number) {
    return this.filesystemService.syncWithProjects(userId);
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Inicializar filesystem para el usuario actual' })
  @ApiResponse({ status: 200, description: 'Filesystem inicializado' })
  async initialize(@UserId() userId: number) {
    await this.filesystemService.initializeForUser(userId);
    return { message: 'Filesystem inicializado correctamente' };
  }
}
