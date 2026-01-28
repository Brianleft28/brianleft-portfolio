import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from '../../entities/folder.entity';
import { File, FileType } from '../../entities/file.entity';
import { Memory, MemoryType } from '../../entities/memory.entity';
import { MemoryKeyword } from '../../entities/memory-keyword.entity';
import { CreateFolderDto, CreateFileDto, UpdateFileDto } from './dto';

export interface FileSystemNode {
  id: number;
  name: string;
  type: 'folder' | 'file';
  fileType?: string;
  content?: string;
  children?: FileSystemNode[];
}

@Injectable()
export class FilesystemService {
  private readonly logger = new Logger(FilesystemService.name);

  constructor(
    @InjectRepository(Folder)
    private foldersRepository: Repository<Folder>,
    @InjectRepository(File)
    private filesRepository: Repository<File>,
    @InjectRepository(Memory)
    private memoriesRepository: Repository<Memory>,
    @InjectRepository(MemoryKeyword)
    private keywordsRepository: Repository<MemoryKeyword>,
  ) {}

  /**
   * Obtiene el árbol completo del filesystem para un usuario
   */
  async getTree(userId: number): Promise<FileSystemNode[]> {
    // Obtener carpetas raíz (sin parent) del usuario
    const rootFolders = await this.foldersRepository.find({
      where: { parentId: IsNull(), userId },
      order: { order: 'ASC' },
    });

    // Construir árbol recursivamente
    const tree: FileSystemNode[] = [];
    for (const folder of rootFolders) {
      tree.push(await this.buildFolderNode(folder, userId));
    }

    return tree;
  }

  /**
   * Construye un nodo de carpeta con sus hijos
   */
  private async buildFolderNode(folder: Folder, userId: number): Promise<FileSystemNode> {
    // Obtener subcarpetas del usuario
    const subfolders = await this.foldersRepository.find({
      where: { parentId: folder.id, userId },
      order: { order: 'ASC' },
    });

    // Obtener archivos del usuario
    const files = await this.filesRepository.find({
      where: { folderId: folder.id, userId },
    });

    const children: FileSystemNode[] = [];

    // Agregar subcarpetas recursivamente
    for (const subfolder of subfolders) {
      children.push(await this.buildFolderNode(subfolder, userId));
    }

    // Agregar archivos
    for (const file of files) {
      children.push({
        id: file.id,
        name: file.name,
        type: 'file',
        fileType: file.type,
        content: file.content || undefined,
      });
    }

    return {
      id: folder.id,
      name: folder.name,
      type: 'folder',
      children,
    };
  }

  /**
   * Obtiene una carpeta por ID verificando ownership
   */
  async getFolderById(id: number, userId?: number): Promise<Folder> {
    const whereClause: any = { id };
    if (userId) whereClause.userId = userId;

    const folder = await this.foldersRepository.findOne({
      where: whereClause,
      relations: ['files', 'children'],
    });

    if (!folder) {
      throw new NotFoundException(`Carpeta con ID ${id} no encontrada`);
    }

    return folder;
  }

  /**
   * Obtiene una carpeta por path (ej: "C:/proyectos/portfolio") para un usuario
   */
  async getFolderByPath(path: string, userId: number): Promise<Folder | null> {
    const parts = path.split('/').filter(Boolean);

    let currentFolder: Folder | null = null;

    for (const part of parts) {
      currentFolder = await this.foldersRepository.findOne({
        where: {
          name: part,
          parentId: currentFolder ? currentFolder.id : IsNull(),
          userId,
        },
      });

      if (!currentFolder) {
        return null;
      }
    }

    return currentFolder;
  }

  /**
   * Obtiene un archivo por ID verificando ownership
   */
  async getFileById(id: number, userId?: number): Promise<File> {
    const whereClause: any = { id };
    if (userId) whereClause.userId = userId;

    const file = await this.filesRepository.findOne({
      where: whereClause,
      relations: ['folder'],
    });

    if (!file) {
      throw new NotFoundException(`Archivo con ID ${id} no encontrado`);
    }

    return file;
  }

  /**
   * Crea una nueva carpeta
   */
  async createFolder(dto: CreateFolderDto, userId: number): Promise<Folder> {
    const folder = this.foldersRepository.create({
      name: dto.name,
      parentId: dto.parentId,
      order: dto.order || 0,
      userId,
    });

    return this.foldersRepository.save(folder);
  }

  /**
   * Crea un nuevo archivo
   */
  async createFile(dto: CreateFileDto, userId: number): Promise<File> {
    // Verificar que la carpeta existe y pertenece al usuario
    await this.getFolderById(dto.folderId, userId);

    const file = this.filesRepository.create({
      name: dto.name,
      type: dto.type,
      content: dto.content,
      folderId: dto.folderId,
      userId,
    });

    return this.filesRepository.save(file);
  }

  /**
   * Actualiza un archivo
   */
  async updateFile(id: number, dto: UpdateFileDto, userId?: number): Promise<File> {
    const file = await this.getFileById(id, userId);

    if (dto.name) file.name = dto.name;
    if (dto.content !== undefined) file.content = dto.content;
    if (dto.isActive !== undefined) file.isActive = dto.isActive;

    return this.filesRepository.save(file);
  }

  /**
   * Elimina una carpeta y todo su contenido
   * También elimina las memorias asociadas si es una carpeta de proyecto
   */
  async deleteFolder(id: number, userId: number): Promise<{ deleted: string[]; memoriesDeleted: string[] }> {
    const folder = await this.getFolderById(id, userId);
    const memoriesDeleted: string[] = [];

    // Verificar si es una carpeta de proyecto (tiene un slug que coincide con memoria del usuario)
    const memory = await this.memoriesRepository.findOne({
      where: { slug: folder.name, type: MemoryType.PROJECT, userId },
    });

    if (memory) {
      // Eliminar keywords primero
      await this.keywordsRepository.delete({ memoryId: memory.id });
      // Eliminar memoria
      await this.memoriesRepository.remove(memory);
      memoriesDeleted.push(folder.name);
      this.logger.log(`Memoria eliminada: ${folder.name}`);
    }

    // Buscar y eliminar memorias de archivos dentro de la carpeta
    const files = await this.filesRepository.find({ where: { folderId: id, userId } });
    for (const file of files) {
      const fileSlug = file.name.replace(/\.(md|txt)$/i, '');
      const fileMemory = await this.memoriesRepository.findOne({
        where: { slug: fileSlug, type: MemoryType.PROJECT, userId },
      });
      if (fileMemory) {
        await this.keywordsRepository.delete({ memoryId: fileMemory.id });
        await this.memoriesRepository.remove(fileMemory);
        memoriesDeleted.push(fileSlug);
        this.logger.log(`Memoria de archivo eliminada: ${fileSlug}`);
      }
    }

    // Eliminar subcarpetas recursivamente
    const subfolders = await this.foldersRepository.find({ where: { parentId: id, userId } });
    for (const subfolder of subfolders) {
      const subResult = await this.deleteFolder(subfolder.id, userId);
      memoriesDeleted.push(...subResult.memoriesDeleted);
    }

    await this.foldersRepository.remove(folder);
    this.logger.log(`Carpeta eliminada: ${folder.name}`);

    return { deleted: [folder.name], memoriesDeleted };
  }

  /**
   * Elimina un archivo
   * También elimina la memoria asociada si existe
   */
  async deleteFile(id: number, userId: number): Promise<{ deleted: string; memoryDeleted: string | null }> {
    const file = await this.getFileById(id, userId);
    let memoryDeleted: string | null = null;

    // Intentar encontrar memoria asociada por slug (nombre sin extensión)
    const slug = file.name.replace(/\.(md|txt)$/i, '');
    const memory = await this.memoriesRepository.findOne({
      where: { slug, type: MemoryType.PROJECT, userId },
    });

    if (memory) {
      // Eliminar keywords primero
      await this.keywordsRepository.delete({ memoryId: memory.id });
      // Eliminar memoria
      await this.memoriesRepository.remove(memory);
      memoryDeleted = slug;
      this.logger.log(`Memoria eliminada junto con archivo: ${slug}`);
    }

    await this.filesRepository.remove(file);
    this.logger.log(`Archivo eliminado: ${file.name}`);

    return { deleted: file.name, memoryDeleted };
  }

  /**
   * Obtiene lista plana de todas las carpetas (para selectores) de un usuario
   */
  async getAllFolders(userId: number): Promise<{ id: number; name: string; path: string }[]> {
    const folders = await this.foldersRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });

    // Construir paths
    const folderMap = new Map(folders.map((f) => [f.id, f]));
    const result: { id: number; name: string; path: string }[] = [];

    for (const folder of folders) {
      const path = this.buildFolderPath(folder, folderMap);
      result.push({
        id: folder.id,
        name: folder.name,
        path,
      });
    }

    return result.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Construye el path completo de una carpeta
   */
  private buildFolderPath(folder: Folder, folderMap: Map<number, Folder>): string {
    const parts: string[] = [folder.name];
    let current = folder;

    while (current.parentId) {
      const parent = folderMap.get(current.parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }

    return parts.join('\\');
  }

  /**
   * Sincroniza el filesystem con los proyectos de memoria
   * Crea carpetas y archivos README para proyectos que no existan
   */
  async syncWithProjects(userId: number): Promise<{ created: string[]; existing: string[] }> {
    const created: string[] = [];
    const existing: string[] = [];

    // Obtener carpeta proyectos del usuario
    let proyectos = await this.foldersRepository.findOne({ 
      where: { name: 'proyectos', userId } 
    });

    if (!proyectos) {
      // Crear estructura base si no existe
      let root = await this.foldersRepository.findOne({ where: { name: 'C:', userId } });
      if (!root) {
        root = this.foldersRepository.create({ name: 'C:', parentId: null, order: 0, userId });
        await this.foldersRepository.save(root);
      }

      proyectos = this.foldersRepository.create({ 
        name: 'proyectos', 
        parentId: root.id, 
        order: 1,
        userId,
      });
      await this.foldersRepository.save(proyectos);
    }

    // Obtener todos los proyectos de memoria del usuario
    const projects = await this.memoriesRepository.find({ 
      where: { type: MemoryType.PROJECT, active: true, userId } 
    });

    for (const project of projects) {
      // Verificar si ya existe la carpeta del proyecto
      const existingFolder = await this.foldersRepository.findOne({
        where: { name: project.slug, parentId: proyectos.id, userId }
      });

      if (existingFolder) {
        existing.push(project.slug);
        
        // Actualizar contenido del README si cambió
        const existingReadme = await this.filesRepository.findOne({
          where: { folderId: existingFolder.id, name: 'README.md', userId }
        });
        
        if (existingReadme && existingReadme.content !== project.content) {
          existingReadme.content = project.content;
          await this.filesRepository.save(existingReadme);
        }
        continue;
      }

      // Crear carpeta del proyecto
      const projectFolder = this.foldersRepository.create({
        name: project.slug,
        parentId: proyectos.id,
        order: 0,
        userId,
      });
      await this.foldersRepository.save(projectFolder);

      // Crear README.md
      const readme = this.filesRepository.create({
        name: 'README.md',
        type: FileType.MARKDOWN,
        folderId: projectFolder.id,
        content: project.content,
        userId,
      });
      await this.filesRepository.save(readme);

      created.push(project.slug);
    }

    return { created, existing };
  }

  /**
   * Inicializa el filesystem base para un nuevo usuario
   */
  async initializeForUser(userId: number): Promise<void> {
    // Verificar si ya tiene carpeta raíz
    const existingRoot = await this.foldersRepository.findOne({ 
      where: { name: 'C:', userId, parentId: IsNull() } 
    });

    if (existingRoot) {
      this.logger.log(`Usuario ${userId} ya tiene filesystem inicializado`);
      return;
    }

    // Crear estructura base
    const root = this.foldersRepository.create({ 
      name: 'C:', 
      parentId: null, 
      order: 0, 
      userId 
    });
    await this.foldersRepository.save(root);

    const proyectos = this.foldersRepository.create({ 
      name: 'proyectos', 
      parentId: root.id, 
      order: 1, 
      userId 
    });
    await this.foldersRepository.save(proyectos);

    const apps = this.foldersRepository.create({ 
      name: 'apps', 
      parentId: root.id, 
      order: 2, 
      userId 
    });
    await this.foldersRepository.save(apps);

    // Crear archivo contacto.exe en apps
    const contactoExe = this.filesRepository.create({
      name: 'contacto.exe',
      type: FileType.EXE,
      content: '# Formulario de Contacto\n\nEste es un ejecutable especial que abre el formulario de contacto.',
      folderId: apps.id,
      userId,
      isActive: true,
    });
    await this.filesRepository.save(contactoExe);

    this.logger.log(`Filesystem inicializado para usuario ${userId}`);
  }
}
