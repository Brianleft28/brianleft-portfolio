import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Memory, MemoryType } from '../../entities/memory.entity';
import { MemoryKeyword } from '../../entities/memory-keyword.entity';
import { Setting } from '../../entities/setting.entity';
import { CreateMemoryDto, UpdateMemoryDto } from './dto';

@Injectable()
export class MemoryService {
  private settingsCache: Map<string, string> = new Map();
  private settingsCacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minuto

  constructor(
    @InjectRepository(Memory)
    private memoriesRepository: Repository<Memory>,
    @InjectRepository(MemoryKeyword)
    private keywordsRepository: Repository<MemoryKeyword>,
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  /**
   * Carga settings en cache para reemplazo de placeholders
   */
  private async loadSettingsCache(): Promise<void> {
    const now = Date.now();
    if (now - this.settingsCacheTime < this.CACHE_TTL && this.settingsCache.size > 0) {
      return; // Cache válido
    }

    const settings = await this.settingsRepository.find();
    this.settingsCache.clear();
    
    for (const setting of settings) {
      this.settingsCache.set(setting.key, setting.value);
    }
    
    this.settingsCacheTime = now;
  }

  /**
   * Reemplaza placeholders {{key}} con valores de settings
   */
  private replacePlaceholders(content: string): string {
    if (!content) return content;
    
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this.settingsCache.get(key) || match;
    });
  }

  /**
   * Aplica parametrización a una memoria
   */
  private hydrateMemory(memory: Memory): Memory {
    return {
      ...memory,
      content: this.replacePlaceholders(memory.content),
      title: this.replacePlaceholders(memory.title),
      summary: memory.summary ? this.replacePlaceholders(memory.summary) : null,
    };
  }

  /**
   * Obtiene todas las memorias activas
   */
  async findAll(): Promise<Memory[]> {
    await this.loadSettingsCache();
    const memories = await this.memoriesRepository.find({
      where: { active: true },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    return memories.map(m => this.hydrateMemory(m));
  }

  /**
   * Obtiene memorias por tipo
   */
  async findByType(type: MemoryType): Promise<Memory[]> {
    await this.loadSettingsCache();
    const memories = await this.memoriesRepository.find({
      where: { type, active: true },
      order: { priority: 'DESC' },
    });
    return memories.map(m => this.hydrateMemory(m));
  }

  /**
   * Obtiene una memoria por slug
   */
  async findBySlug(slug: string): Promise<Memory | null> {
    await this.loadSettingsCache();
    const memory = await this.memoriesRepository.findOne({
      where: { slug, active: true },
    });
    return memory ? this.hydrateMemory(memory) : null;
  }

  /**
   * Obtiene una memoria por ID
   */
  async findById(id: number): Promise<Memory> {
    await this.loadSettingsCache();
    const memory = await this.memoriesRepository.findOne({
      where: { id },
    });

    if (!memory) {
      throw new NotFoundException(`Memoria con ID ${id} no encontrada`);
    }

    return this.hydrateMemory(memory);
  }

  /**
   * Busca memorias relevantes para un prompt dado
   * Usa keywords para hacer matching
   */
  async findRelevant(prompt: string): Promise<Memory[]> {
    await this.loadSettingsCache();
    const promptLower = prompt.toLowerCase();

    // Buscar keywords que matcheen con el prompt
    const matchingKeywords = await this.keywordsRepository
      .createQueryBuilder('k')
      .where('LOWER(:prompt) LIKE CONCAT("%", LOWER(k.keyword), "%")', { prompt: promptLower })
      .getMany();

    if (matchingKeywords.length === 0) {
      // Si no hay match, devolver memorias base (meta + index)
      return this.memoriesRepository.find({
        where: [
          { type: MemoryType.META, active: true },
          { type: MemoryType.INDEX, active: true },
        ],
      });
    }

    // Obtener memorias únicas de los keywords
    const memoryIds = [...new Set(matchingKeywords.map((k) => k.memoryId))];
    
    return this.memoriesRepository.find({
      where: { id: In(memoryIds), active: true },
      order: { priority: 'DESC' },
    }).then(memories => memories.map(m => this.hydrateMemory(m)));
  }

  /**
   * Obtiene resúmenes de todos los proyectos (para listar)
   */
  async getProjectSummaries(): Promise<{ slug: string; title: string; summary: string }[]> {
    const projects = await this.findByType(MemoryType.PROJECT);

    return projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary || 'Sin resumen disponible',
    }));
  }

  /**
   * Crea una nueva memoria
   */
  async create(dto: CreateMemoryDto): Promise<Memory> {
    const memory = this.memoriesRepository.create({
      type: dto.type,
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      summary: dto.summary,
      priority: dto.priority || 0,
    });

    const savedMemory = await this.memoriesRepository.save(memory);

    // Crear keywords
    if (dto.keywords && dto.keywords.length > 0) {
      const keywords = dto.keywords.map((keyword) =>
        this.keywordsRepository.create({
          memoryId: savedMemory.id,
          keyword: keyword.toLowerCase(),
        }),
      );
      await this.keywordsRepository.save(keywords);
    }

    return this.findById(savedMemory.id);
  }

  /**
   * Actualiza una memoria
   */
  async update(id: number, dto: UpdateMemoryDto): Promise<Memory> {
    const memory = await this.findById(id);

    if (dto.title) memory.title = dto.title;
    if (dto.content) memory.content = dto.content;
    if (dto.summary !== undefined) memory.summary = dto.summary;
    if (dto.priority !== undefined) memory.priority = dto.priority;
    if (dto.active !== undefined) memory.active = dto.active;

    await this.memoriesRepository.save(memory);

    // Actualizar keywords si se proporcionan
    if (dto.keywords) {
      // Eliminar keywords existentes
      await this.keywordsRepository.delete({ memoryId: id });

      // Crear nuevos keywords
      const keywords = dto.keywords.map((keyword) =>
        this.keywordsRepository.create({
          memoryId: id,
          keyword: keyword.toLowerCase(),
        }),
      );
      await this.keywordsRepository.save(keywords);
    }

    return this.findById(id);
  }

  /**
   * Elimina una memoria
   */
  async delete(id: number): Promise<void> {
    const memory = await this.findById(id);
    await this.memoriesRepository.remove(memory);
  }
}
