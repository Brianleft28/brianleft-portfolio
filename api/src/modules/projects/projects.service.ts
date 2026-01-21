import { Injectable, Logger } from '@nestjs/common';
import { FilesystemService } from '../filesystem/filesystem.service';
import { MemoryService } from '../memory/memory.service';
import { ChatService } from '../chat/chat.service';
import { MemoryType } from '../../entities/memory.entity';
import { FileType } from '../../entities/file.entity';

export interface CreateProjectDto {
  name: string;
  slug: string;
  content: string;
  keywords?: string[];
  folderId?: number; // Carpeta donde crear el archivo (default: proyectos)
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private filesystemService: FilesystemService,
    private memoryService: MemoryService,
    private chatService: ChatService,
  ) {}

  /**
   * Crea un proyecto completo:
   * 1. Archivo en el filesystem
   * 2. Memoria para la IA con resumen generado
   */
  async createProject(dto: CreateProjectDto) {
    this.logger.log(`Creando proyecto: ${dto.name}`);

    // 1. Generar resumen con IA
    const summary = await this.chatService.generateSummary(dto.content);
    this.logger.log(`Resumen generado para ${dto.name}`);

    // 2. Crear memoria
    const memory = await this.memoryService.create({
      type: MemoryType.PROJECT,
      slug: dto.slug,
      title: dto.name,
      content: dto.content,
      summary,
      keywords: dto.keywords || this.extractKeywords(dto.name, dto.content),
    });
    this.logger.log(`Memoria creada: ${memory.id}`);

    // 3. Crear archivo en filesystem (si se especifica carpeta)
    let file = null;
    if (dto.folderId) {
      file = await this.filesystemService.createFile({
        name: `${dto.slug}.md`,
        type: FileType.MARKDOWN,
        content: dto.content,
        folderId: dto.folderId,
      });
      this.logger.log(`Archivo creado: ${file.id}`);
    }

    return {
      memory,
      file,
      summary,
    };
  }

  /**
   * Lista todos los proyectos con sus resúmenes
   */
  async listProjects() {
    const memories = await this.memoryService.findByType(MemoryType.PROJECT);

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
  async getProject(slug: string) {
    const memory = await this.memoryService.findBySlug(slug);
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
