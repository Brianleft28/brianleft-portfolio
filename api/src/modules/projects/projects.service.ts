import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FilesystemService } from '../filesystem/filesystem.service';
import { MemoryService } from '../memory/memory.service';
import { ChatService } from '../chat/chat.service';
import { MemoryType } from '../../entities/memory.entity';
import { FileType } from '../../entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../../entities/memory.entity';
import { detectTechStack } from './project-sections';

export interface CreateProjectDto {
  name: string;
  slug: string;
  content: string;
  keywords?: string[];
  folderId?: number; // Carpeta donde crear el archivo (default: proyectos)
  techStack?: string[]; // Tecnologías usadas (se detectan automáticamente si no se envían)
}

export interface UpdateProjectDto {
  name?: string;
  content?: string;
  summary?: string;
  keywords?: string[];
  priority?: number;
}

export interface ProjectSummaryForMemory {
  title: string;
  type: string;
  description: string;
  techStack: string[];
  keyFeatures: string[];
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private filesystemService: FilesystemService,
    private memoryService: MemoryService,
    private chatService: ChatService,
    @InjectRepository(Memory)
    private memoryRepository: Repository<Memory>,
  ) {}

  /**
   * Crea un proyecto completo:
   * 1. Archivo en el filesystem
   * 2. Memoria para la IA con resumen generado
   * 3. Actualiza memory.md con el nuevo proyecto
   * 4. Actualiza index.md con nuevas habilidades
   */
  async createProject(dto: CreateProjectDto, userId: number = 1) {
    this.logger.log(`Creando proyecto: ${dto.name}`);

    // 1. Extraer tecnologías del contenido
    const detectedTech = dto.techStack || detectTechStack(dto.content);
    this.logger.log(`Tecnologías detectadas: ${detectedTech.join(', ')}`);

    // 2. Generar resumen estructurado con IA
    const structuredSummary = await this.generateStructuredSummary(
      dto.name,
      dto.content,
      detectedTech,
    );
    this.logger.log(`Resumen estructurado generado para ${dto.name}`);

    // 3. Generar keywords con IA si no se proporcionan
    let keywords = dto.keywords;
    if (!keywords || keywords.length === 0) {
      // Usar el servicio de memoria para generar keywords con IA
      keywords = await this.memoryService.generateKeywords(dto.name, dto.content);
      this.logger.log(`Keywords generadas con IA: ${keywords.join(', ')}`);
    }

    // 4. Crear memoria del proyecto
    const memory = await this.memoryService.create({
      type: MemoryType.PROJECT,
      slug: dto.slug,
      title: dto.name,
      content: dto.content,
      summary: structuredSummary.description,
      keywords: keywords,
    }, userId);
    this.logger.log(`Memoria creada: ${memory.id}`);

    // 5. Crear archivo en filesystem (si se especifica carpeta)
    let file = null;
    if (dto.folderId) {
      file = await this.filesystemService.createFile({
        name: `${dto.slug}.md`,
        type: FileType.MARKDOWN,
        content: dto.content,
        folderId: dto.folderId,
      }, userId);
      this.logger.log(`Archivo creado: ${file.id}`);
    }

    // 6. Regenerar las secciones de proyectos de index y memory.
    //    Se regeneran completas (no se appendea) para que este camino y el del
    //    seeder produzcan exactamente el mismo bloque y nada se duplique.
    await this.memoryService.regenerateProjectSections(userId);

    return {
      memory,
      file,
      summary: structuredSummary,
      technologiesAdded: detectedTech,
      keywords: keywords,
    };
  }

  /**
   * Genera un resumen estructurado usando IA
   */
  private async generateStructuredSummary(
    projectName: string,
    content: string,
    techStack: string[],
  ): Promise<ProjectSummaryForMemory> {
    // Usar el método existente para generar resumen
    const aiSummary = await this.chatService.generateSummary(content);

    // Extraer tipo de proyecto del contenido
    const typeMatch =
      content.match(/\*\*Tipo:\*\*\s*([^\n]+)/i) || content.match(/Tipo:\s*([^\n]+)/i);
    const projectType = typeMatch ? typeMatch[1].trim() : 'Personal/I+D';

    // Extraer características clave
    const features = this.extractFeatures(content);

    return {
      title: projectName,
      type: projectType,
      description: aiSummary,
      techStack,
      keyFeatures: features,
    };
  }

  /**
   * Extrae características/features del contenido
   */
  private extractFeatures(content: string): string[] {
    const features: string[] = [];

    // Buscar listas después de "Características" o "Features"
    const featuresSection = content.match(
      /(?:características|features|funcionalidades)[:\s]*\n((?:[-*]\s*[^\n]+\n?)+)/i,
    );
    if (featuresSection) {
      const lines = featuresSection[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^[-*]\s*(.+)/);
        if (match && match[1].length > 10) {
          features.push(match[1].trim());
        }
      }
    }

    return features.slice(0, 5); // Máximo 5 features
  }

  /**
   * Lista todos los proyectos con sus resúmenes
   */
  async listProjects(userId: number = 1) {
    const memories = await this.memoryService.findByType(MemoryType.PROJECT, userId);

    return memories.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      summary: m.summary,
      keywords: m.keywords.map((k) => k.keyword),
      createdAt: m.createdAt,
    }));
  }

  /**
   * Obtiene un proyecto completo por slug
   */
  async getProject(slug: string, userId: number = 1) {
    const memory = await this.memoryService.findBySlug(slug, userId);
    if (!memory) {
      return null;
    }

    return {
      id: memory.id,
      slug: memory.slug,
      title: memory.title,
      content: memory.content,
      summary: memory.summary,
      keywords: memory.keywords.map((k) => k.keyword),
      createdAt: memory.createdAt,
    };
  }

  /**
   * Edita un proyecto existente. Si cambia el contenido, se resincroniza el
   * README del filesystem virtual y se regeneran las secciones de proyectos.
   */
  async updateProject(slug: string, dto: UpdateProjectDto, userId: number = 1) {
    const memory = await this.memoryRepository.findOne({
      where: { slug, type: MemoryType.PROJECT, userId },
    });

    if (!memory) {
      throw new NotFoundException(`Proyecto "${slug}" no encontrado`);
    }

    const changes: Partial<Memory> = {};
    if (dto.name !== undefined) changes.title = dto.name;
    if (dto.content !== undefined) changes.content = dto.content;
    if (dto.summary !== undefined) changes.summary = dto.summary;
    if (dto.priority !== undefined) changes.priority = dto.priority;

    if (Object.keys(changes).length > 0) {
      await this.memoryRepository.update(memory.id, changes);
    }

    if (dto.keywords) {
      await this.memoryService.replaceKeywords(memory.id, dto.keywords);
    }

    if (dto.content !== undefined) {
      // El README de C:/proyectos/<slug>/ se actualiza si el contenido cambió.
      await this.filesystemService.syncWithProjects(userId);
    }

    await this.memoryService.regenerateProjectSections(userId);

    return this.getProject(slug, userId);
  }

  /**
   * Elimina un proyecto: su memoria, sus keywords, su carpeta en el filesystem
   * virtual y su entrada en las secciones generadas.
   */
  async deleteProject(slug: string, userId: number = 1) {
    const memory = await this.memoryRepository.findOne({
      where: { slug, type: MemoryType.PROJECT, userId },
    });

    if (!memory) {
      throw new NotFoundException(`Proyecto "${slug}" no encontrado`);
    }

    // Borra también la memoria asociada, así que hay que hacerlo antes de
    // eliminarla acá para no dejar la carpeta huérfana.
    const folderRemoved = await this.filesystemService.deleteProjectFolder(slug, userId);

    const stillExists = await this.memoryRepository.findOne({ where: { id: memory.id } });
    if (stillExists) {
      await this.memoryService.delete(memory.id, userId);
    }

    await this.memoryService.regenerateProjectSections(userId);
    this.logger.log(`Proyecto "${slug}" eliminado (carpeta: ${folderRemoved ? 'sí' : 'no'}).`);

    return { deleted: slug, folderRemoved };
  }

  /**
   * Extrae keywords automáticamente del título y contenido
   */
  private extractKeywords(title: string, content: string): string[] {
    const keywords: Set<string> = new Set();

    // Del título
    const titleWords = title.toLowerCase().split(/\s+/);
    titleWords.forEach((w) => {
      if (w.length > 3) keywords.add(w);
    });

    // Tecnologías comunes
    const techRegex =
      /\b(svelte|react|vue|angular|node|nest|express|typescript|javascript|python|docker|mysql|postgres|redis|graphql|rest|api|aws|azure|gcp)\b/gi;
    const techMatches = content.match(techRegex) || [];
    techMatches.forEach((t) => keywords.add(t.toLowerCase()));

    return Array.from(keywords).slice(0, 10);
  }
}
