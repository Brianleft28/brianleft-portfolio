import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FilesystemService } from './filesystem.service';
import { CreateFolderDto, CreateFileDto, UpdateFileDto } from './dto';

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

  @Get('folders')
  @ApiOperation({ summary: 'Listar todas las carpetas (flat list)' })
  @ApiResponse({ status: 200, description: 'Lista de carpetas con paths' })
  async getAllFolders() {
    return this.filesystemService.getAllFolders();
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
  @ApiOperation({ summary: 'Crear carpeta' })
  @ApiResponse({ status: 201, description: 'Carpeta creada' })
  async createFolder(@Body() dto: CreateFolderDto) {
    return this.filesystemService.createFolder(dto);
  }

  @Post('file')
  @ApiOperation({ summary: 'Crear archivo' })
  @ApiResponse({ status: 201, description: 'Archivo creado' })
  async createFile(@Body() dto: CreateFileDto) {
    return this.filesystemService.createFile(dto);
  }

  @Patch('file/:id')
  @ApiOperation({ summary: 'Actualizar archivo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo actualizado' })
  async updateFile(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFileDto) {
    return this.filesystemService.updateFile(id, dto);
  }

  @Delete('folder/:id')
  @ApiOperation({ summary: 'Eliminar carpeta' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Carpeta eliminada' })
  async deleteFolder(@Param('id', ParseIntPipe) id: number) {
    await this.filesystemService.deleteFolder(id);
    return { message: 'Carpeta eliminada correctamente' };
  }

  @Delete('file/:id')
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Archivo eliminado' })
  async deleteFile(@Param('id', ParseIntPipe) id: number) {
    await this.filesystemService.deleteFile(id);
    return { message: 'Archivo eliminado correctamente' };
  }
}
