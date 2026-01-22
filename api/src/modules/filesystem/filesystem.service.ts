import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from '../../entities/folder.entity';
import { File } from '../../entities/file.entity';
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
  constructor(
    @InjectRepository(Folder)
    private foldersRepository: Repository<Folder>,
    @InjectRepository(File)
    private filesRepository: Repository<File>,
  ) {}

  /**
   * Obtiene el árbol completo del filesystem
   */
  async getTree(): Promise<FileSystemNode[]> {
    // Obtener carpetas raíz (sin parent)
    const rootFolders = await this.foldersRepository.find({
      where: { parentId: IsNull() },
      order: { order: 'ASC' },
    });

    // Construir árbol recursivamente
    const tree: FileSystemNode[] = [];
    for (const folder of rootFolders) {
      tree.push(await this.buildFolderNode(folder));
    }

    return tree;
  }

  /**
   * Construye un nodo de carpeta con sus hijos
   */
  private async buildFolderNode(folder: Folder): Promise<FileSystemNode> {
    // Obtener subcarpetas
    const subfolders = await this.foldersRepository.find({
      where: { parentId: folder.id },
      order: { order: 'ASC' },
    });

    // Obtener archivos
    const files = await this.filesRepository.find({
      where: { folderId: folder.id },
    });

    const children: FileSystemNode[] = [];

    // Agregar subcarpetas recursivamente
    for (const subfolder of subfolders) {
      children.push(await this.buildFolderNode(subfolder));
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
   * Obtiene una carpeta por ID con sus archivos
   */
  async getFolderById(id: number): Promise<Folder> {
    const folder = await this.foldersRepository.findOne({
      where: { id },
      relations: ['files', 'children'],
    });

    if (!folder) {
      throw new NotFoundException(`Carpeta con ID ${id} no encontrada`);
    }

    return folder;
  }

  /**
   * Obtiene una carpeta por path (ej: "C:/proyectos/portfolio")
   */
  async getFolderByPath(path: string): Promise<Folder | null> {
    const parts = path.split('/').filter(Boolean);

    let currentFolder: Folder | null = null;

    for (const part of parts) {
      currentFolder = await this.foldersRepository.findOne({
        where: {
          name: part,
          parentId: currentFolder ? currentFolder.id : IsNull(),
        },
      });

      if (!currentFolder) {
        return null;
      }
    }

    return currentFolder;
  }

  /**
   * Obtiene un archivo por ID
   */
  async getFileById(id: number): Promise<File> {
    const file = await this.filesRepository.findOne({
      where: { id },
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
  async createFolder(dto: CreateFolderDto): Promise<Folder> {
    const folder = this.foldersRepository.create({
      name: dto.name,
      parentId: dto.parentId,
      order: dto.order || 0,
    });

    return this.foldersRepository.save(folder);
  }

  /**
   * Crea un nuevo archivo
   */
  async createFile(dto: CreateFileDto): Promise<File> {
    // Verificar que la carpeta existe
    await this.getFolderById(dto.folderId);

    const file = this.filesRepository.create({
      name: dto.name,
      type: dto.type,
      content: dto.content,
      folderId: dto.folderId,
    });

    return this.filesRepository.save(file);
  }

  /**
   * Actualiza un archivo
   */
  async updateFile(id: number, dto: UpdateFileDto): Promise<File> {
    const file = await this.getFileById(id);

    if (dto.name) file.name = dto.name;
    if (dto.content !== undefined) file.content = dto.content;
    if (dto.isActive !== undefined) file.isActive = dto.isActive;

    return this.filesRepository.save(file);
  }

  /**
   * Elimina una carpeta y todo su contenido
   */
  async deleteFolder(id: number): Promise<void> {
    const folder = await this.getFolderById(id);
    await this.foldersRepository.remove(folder);
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(id: number): Promise<void> {
    const file = await this.getFileById(id);
    await this.filesRepository.remove(file);
  }

  /**
   * Obtiene lista plana de todas las carpetas (para selectores)
   */
  async getAllFolders(): Promise<{ id: number; name: string; path: string }[]> {
    const folders = await this.foldersRepository.find({
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
}
