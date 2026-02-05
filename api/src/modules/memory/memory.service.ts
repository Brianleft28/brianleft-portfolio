import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Memory, MemoryType } from '../../entities/memory.entity';
import { MemoryKeyword } from '../../entities/memory-keyword.entity';
import { Setting } from '../../entities/setting.entity';
import { CreateMemoryDto, UpdateMemoryDto } from './dto';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class MemoryService {
  // Cache por userId
  private settingsCache: Map<number, Map<string, string>> = new Map();
  private settingsCacheTime: Map<number, number> = new Map();
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
   * Carga settings en cache para reemplazo de placeholders (por usuario)
   */
  private async loadSettingsCache(userId: number): Promise<void> {
    const now = Date.now();
    const cacheTime = this.settingsCacheTime.get(userId) || 0;
    const userCache = this.settingsCache.get(userId);
    
    if (now - cacheTime < this.CACHE_TTL && userCache && userCache.size > 0) {
      return; // Cache válido
    }

    const settings = await this.settingsRepository.find({ where: { userId } });
    const newCache = new Map<string, string>();
    
    for (const setting of settings) {
      newCache.set(setting.key, setting.value);
    }
    
    this.settingsCache.set(userId, newCache);
    this.settingsCacheTime.set(userId, now);
  }

  /**
   * Reemplaza placeholders {{key}} con valores de settings
   */
  private replacePlaceholders(content: string, userId: number): string {
    if (!content) return content;
    
    const cache = this.settingsCache.get(userId);
    if (!cache) return content;
    
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return cache.get(key) || match;
    });
  }

  /**
   * Aplica parametrización a una memoria
   */
  private hydrateMemory(memory: Memory, userId: number): Memory {
    return {
      ...memory,
      content: this.replacePlaceholders(memory.content, userId),
      title: this.replacePlaceholders(memory.title, userId),
      summary: memory.summary ? this.replacePlaceholders(memory.summary, userId) : null,
    };
  }

  /**
   * Obtiene todas las memorias activas de un usuario
   */
  async findAll(userId: number): Promise<Memory[]> {
    await this.loadSettingsCache(userId);
    const memories = await this.memoriesRepository.find({
      where: { active: true, userId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
    return memories.map(m => this.hydrateMemory(m, userId));
  }

  /**
   * Obtiene memorias por tipo de un usuario
   */
  async findByType(type: MemoryType, userId: number): Promise<Memory[]> {
    await this.loadSettingsCache(userId);
    const memories = await this.memoriesRepository.find({
      where: { type, active: true, userId },
      order: { priority: 'DESC' },
    });
    return memories.map(m => this.hydrateMemory(m, userId));
  }

  /**
   * Obtiene una memoria por slug de un usuario
   */
  async findBySlug(slug: string, userId: number): Promise<Memory | null> {
    await this.loadSettingsCache(userId);
    const memory = await this.memoriesRepository.findOne({
      where: { slug, active: true, userId },
    });
    return memory ? this.hydrateMemory(memory, userId) : null;
  }

  /**
   * Obtiene una memoria por ID de un usuario
   */
  async findById(id: number, userId?: number): Promise<Memory> {
    const whereClause: any = { id };
    if (userId) whereClause.userId = userId;
    
    const memory = await this.memoriesRepository.findOne({
      where: whereClause,
    });

    if (!memory) {
      throw new NotFoundException(`Memoria con ID ${id} no encontrada`);
    }

    // Solo cargar settings si hay userId (no para memorias globales)
    if (memory.userId) {
      await this.loadSettingsCache(memory.userId);
      return this.hydrateMemory(memory, memory.userId);
    }
    
    return memory;
  }

  /**
   * Busca memorias relevantes para un prompt dado (para un usuario)
   * Usa keywords para hacer matching
   */
  async findRelevant(prompt: string, userId: number): Promise<Memory[]> {
    await this.loadSettingsCache(userId);
    const promptLower = prompt.toLowerCase();

    // Buscar keywords que matcheen con el prompt para memorias del usuario
    const matchingKeywords = await this.keywordsRepository
      .createQueryBuilder('k')
      .innerJoin('k.memory', 'm')
      .where('m.userId = :userId', { userId })
      .andWhere('LOWER(:prompt) LIKE CONCAT("%", LOWER(k.keyword), "%")', { prompt: promptLower })
      .getMany();

    if (matchingKeywords.length === 0) {
      // Si no hay match, devolver memorias base (meta + index) del usuario
      const memories = await this.memoriesRepository.find({
        where: [
          { type: MemoryType.META, active: true, userId },
          { type: MemoryType.INDEX, active: true, userId },
        ],
      });
      return memories.map(m => this.hydrateMemory(m, userId));
    }

    // Obtener memorias únicas de los keywords
    const memoryIds = [...new Set(matchingKeywords.map((k) => k.memoryId))];
    
    return this.memoriesRepository.find({
      where: { id: In(memoryIds), active: true, userId },
      order: { priority: 'DESC' },
    }).then(memories => memories.map(m => this.hydrateMemory(m, userId)));
  }

  /**
   * Obtiene resúmenes de todos los proyectos de un usuario (para listar)
   */
  async getProjectSummaries(userId: number): Promise<{ slug: string; title: string; summary: string }[]> {
    const projects = await this.findByType(MemoryType.PROJECT, userId);

    return projects.map((p) => ({
      slug: p.slug,
      title: p.title,
      summary: p.summary || 'Sin resumen disponible',
    }));
  }

  /**
   * Crea una nueva memoria para un usuario
   */
  async create(dto: CreateMemoryDto, userId: number): Promise<Memory> {
    const memory = this.memoriesRepository.create({
      type: dto.type,
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      summary: dto.summary,
      priority: dto.priority || 0,
      userId,
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

    return this.findById(savedMemory.id, userId);
  }

  /**
   * Actualiza una memoria (verificando ownership)
   */
  async update(id: number, dto: UpdateMemoryDto, userId?: number): Promise<Memory> {
    const memory = await this.findById(id, userId);

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

    return this.findById(id, userId);
  }

  /**
   * Elimina una memoria (verificando ownership)
   */
  async delete(id: number, userId?: number): Promise<void> {
    const memory = await this.findById(id, userId);
    await this.memoriesRepository.remove(memory);
  }

  /**
   * Genera resúmenes y keywords para todos los proyectos de un usuario que les falten
   */
  async generateMissingSummaries(userId: number): Promise<{ updated: string[]; failed: string[]; keywordsGenerated: string[] }> {
    const updated: string[] = [];
    const failed: string[] = [];
    const keywordsGenerated: string[] = [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY no configurada');
      return { updated, failed: ['No API key configured'], keywordsGenerated };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Obtener proyectos del usuario
    const projects = await this.memoriesRepository.find({
      where: { type: MemoryType.PROJECT, active: true, userId },
      relations: ['keywords'],
    });

    for (const project of projects) {
      const needsSummary = !project.summary;
      const needsKeywords = !project.keywords || project.keywords.length < 5;
      
      if (!needsSummary && !needsKeywords) {
        continue; // Ya tiene todo
      }

      try {
        // Generar resumen si falta
        if (needsSummary) {
          const summaryPrompt = `Dado el siguiente proyecto de software, generá un resumen CONCISO en español (máximo 3 oraciones) que describa:
1. Qué hace el proyecto
2. Las tecnologías principales usadas
3. El valor o impacto del proyecto

Proyecto: "${project.title}"

Contenido:
${project.content?.slice(0, 3000) || 'Sin contenido'}

Respondé SOLO con el resumen, sin introducción ni formato markdown.`;

          const result = await model.generateContent(summaryPrompt);
          const summary = result.response.text().trim();

          if (summary && summary.length > 20) {
            project.summary = summary;
            await this.memoriesRepository.save(project);
            updated.push(project.slug);
          } else {
            failed.push(project.slug);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Generar keywords si faltan o son muy pocas
        if (needsKeywords) {
          // Eliminar keywords existentes
          if (project.keywords && project.keywords.length > 0) {
            await this.keywordsRepository.remove(project.keywords);
          }

          const keywords = await this.generateKeywords(project.title, project.content);
          
          if (keywords.length >= 5) {
            // Crear nuevas keywords
            const keywordEntities = keywords.map(keyword => 
              this.keywordsRepository.create({ memory: project, keyword })
            );
            await this.keywordsRepository.save(keywordEntities);
            keywordsGenerated.push(project.slug);
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Actualizar memoria DOCS (memory.md) con el proyecto
        if (needsSummary && project.summary && project.userId) {
          await this.updateDocsMemory(project.title, project.slug, project.summary, project.userId);
          await this.updateIndexWithProject(project, project.userId);
        }
      } catch (error) {
        console.error(`Error generando contenido para ${project.slug}:`, error);
        if (!failed.includes(project.slug)) {
          failed.push(project.slug);
        }
      }
    }

    return { updated, failed, keywordsGenerated };
  }

  /**
   * Formatea el título de un proyecto (capitalización correcta)
   */
  formatProjectTitle(title: string): string {
    // Si tiene formato "proyecto-nombre" o es todo minúsculas
    const words = title.replace(/-/g, ' ').split(/\s+/);
    return words.map(word => {
      // Mantener siglas en mayúsculas
      if (word.toUpperCase() === word && word.length <= 4) {
        return word;
      }
      // Capitalizar primera letra
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  /**
   * Genera keywords relevantes para un proyecto usando IA
   */
  async generateKeywords(title: string, content: string): Promise<string[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Generar keywords básicas del título
      return title.toLowerCase().replace(/-/g, ' ').split(/\s+/).slice(0, 5);
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Dado el siguiente proyecto de software, generá exactamente 15 keywords/tags relevantes para búsqueda.

Proyecto: "${title}"

Contenido:
${content?.slice(0, 2500) || 'Sin contenido'}

REGLAS:
- Exactamente 15 keywords separadas por comas
- Incluir: nombre del proyecto, tecnologías, tipo de proyecto, conceptos clave
- Keywords en minúsculas
- Sin caracteres especiales excepto guiones
- Priorizar términos técnicos específicos
- Incluir variantes (ej: "auth" y "autenticación")

Respondé SOLO con las 15 keywords separadas por comas, nada más.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      const keywords = response
        .split(',')
        .map(k => k.trim().toLowerCase().replace(/[^a-z0-9áéíóúñü\s-]/g, ''))
        .filter(k => k.length > 1 && k.length < 50)
        .slice(0, 15);

      return keywords.length >= 5 ? keywords : this.generateBasicKeywords(title);
    } catch (error) {
      console.error('Error generando keywords con IA:', error);
      return this.generateBasicKeywords(title);
    }
  }

  /**
   * Genera keywords básicas sin IA
   */
  private generateBasicKeywords(title: string): string[] {
    const words = title.toLowerCase().replace(/-/g, ' ').split(/\s+/);
    return [...new Set([...words, title.toLowerCase().replace(/\s+/g, '-')])].slice(0, 5);
  }

  /**
   * Crea un proyecto con retroalimentación completa de memoria
   * 1. Genera summary con IA
   * 2. Genera keywords con IA
   * 3. Crea la memoria tipo PROJECT
   * 4. Actualiza la memoria DOCS (memory.md equivalente)
   */
  async createProjectWithFeedback(dto: {
    title: string;
    slug: string;
    content: string;
  }, userId: number): Promise<{ project: Memory; summary: string; keywords: string[] }> {
    // 1. Verificar que no exista para este usuario
    const existing = await this.memoriesRepository.findOne({ 
      where: { slug: dto.slug, userId } 
    });
    if (existing) {
      throw new Error(`Ya existe un proyecto con slug "${dto.slug}"`);
    }

    // 2. Generar summary con IA
    let summary = '';
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const summaryPrompt = `Dado el siguiente proyecto de software, generá un resumen CONCISO en español (máximo 3 oraciones) que describa:
1. Qué hace el proyecto
2. Las tecnologías principales usadas
3. El valor o impacto del proyecto

Proyecto: "${dto.title}"

Contenido:
${dto.content?.slice(0, 3000) || 'Sin contenido'}

Respondé SOLO con el resumen, sin introducción ni formato markdown.`;

        const result = await model.generateContent(summaryPrompt);
        summary = result.response.text().trim();
      } catch (error) {
        console.error('Error generando summary:', error);
      }
    }

    // 3. Generar keywords con IA
    const keywords = await this.generateKeywords(dto.title, dto.content);

    // 4. Crear la memoria PROJECT
    const project = this.memoriesRepository.create({
      type: MemoryType.PROJECT,
      slug: dto.slug,
      title: dto.title,
      content: dto.content,
      summary: summary || null,
      priority: 0,
      userId,
    });
    const savedProject = await this.memoriesRepository.save(project);

    // 5. Guardar keywords
    const keywordEntities = keywords.map(keyword =>
      this.keywordsRepository.create({
        memoryId: savedProject.id,
        keyword: keyword.toLowerCase(),
      }),
    );
    await this.keywordsRepository.save(keywordEntities);

    // 6. Actualizar memoria DOCS (retroalimentación)
    await this.updateDocsMemory(dto.title, dto.slug, summary, userId);

    return { 
      project: savedProject, 
      summary, 
      keywords 
    };
  }

  /**
   * Actualiza la memoria DOCS agregando un nuevo proyecto
   */
  private async updateDocsMemory(title: string, slug: string, summary: string, userId: number): Promise<void> {
    try {
      // Buscar la memoria de tipo DOCS (equivalente a memory.md) del usuario
      let docsMemory = await this.memoriesRepository.findOne({
        where: { type: MemoryType.DOCS, userId },
      });

      if (!docsMemory) {
        // Si no existe, crear una básica
        docsMemory = this.memoriesRepository.create({
          type: MemoryType.DOCS,
          slug: 'memory',
          title: 'Base de Conocimiento',
          content: '# Base de Conocimiento\n\n## Proyectos\n\n',
          priority: 5,
          userId,
        });
        await this.memoriesRepository.save(docsMemory);
      }

      // Agregar el nuevo proyecto al contenido
      const newEntry = `
### ${this.formatProjectTitle(title)}

${summary || 'Proyecto sin resumen'}
- **Slug:** \`${slug}\`
- **Archivo fuente:** \`projects/${slug}.md\`
`;

      // Buscar dónde insertar (antes de sección de contacto si existe)
      const contactSection = '## [DATOS DE CONTACTO]';
      if (docsMemory.content.includes(contactSection)) {
        docsMemory.content = docsMemory.content.replace(
          contactSection, 
          newEntry + '\n' + contactSection
        );
      } else {
        // Agregar al final
        docsMemory.content += newEntry;
      }

      await this.memoriesRepository.save(docsMemory);
    } catch (error) {
      console.error('Error actualizando memoria DOCS:', error);
    }
  }

  /**
   * Inicializa las memorias base para un nuevo usuario:
   * - INDEX: Perfil profesional con placeholders
   * - DOCS (memory): Base de conocimiento para proyectos
   */
  async initializeForUser(userId: number, displayName: string): Promise<void> {
    console.log(`[MemoryService] Inicializando memorias para usuario ${userId}`);

    // 1. Crear memoria INDEX (perfil profesional)
    const existingIndex = await this.memoriesRepository.findOne({
      where: { slug: 'index', userId },
    });

    if (!existingIndex) {
      const indexContent = `# PERFIL PROFESIONAL — {{owner_name}}

## Identidad

- **Nombre:** {{owner_name}}
- **Rol:** {{owner_role}}
- **Ubicación:** {{owner_location}}
- **Filosofía:** "{{owner_philosophy}}"

## Especialización

Completa tu perfil desde el panel de administración en \`/admin/settings\`.

## Stack Tecnológico

Configura tu stack tecnológico desde el panel de administración.

## Enlaces

- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
- Email: {{owner_email}}

## Disponibilidad

{{contact_availability}}

---

## Proyectos Destacados

Los proyectos agregados aparecerán aquí automáticamente.

---

Documento optimizado para consumo por IA. Los placeholders {{variable}} se reemplazan dinámicamente.
`;

      const indexMemory = this.memoriesRepository.create({
        type: MemoryType.INDEX,
        slug: 'index',
        title: `Perfil de ${displayName}`,
        content: indexContent,
        summary: `Perfil profesional de ${displayName}`,
        priority: 8,
        userId,
      });
      await this.memoriesRepository.save(indexMemory);
      console.log(`[MemoryService] Memoria INDEX creada para usuario ${userId}`);
    }

    // 2. Crear memoria DOCS (base de conocimiento / memory.md)
    const existingDocs = await this.memoriesRepository.findOne({
      where: { type: MemoryType.DOCS, userId },
    });

    if (!existingDocs) {
      const docsContent = `# Base de Conocimiento — {{owner_name}}

## Acerca de este documento

Este documento sirve como índice de proyectos y conocimiento para la IA del portfolio.
Los proyectos se agregan automáticamente cuando los creas desde el panel de administración.

---

## Proyectos

_Aún no hay proyectos registrados. Crea tu primer proyecto desde /admin/projects._

---

## [DATOS DE CONTACTO]

- Email: {{owner_email}}
- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
`;

      const docsMemory = this.memoriesRepository.create({
        type: MemoryType.DOCS,
        slug: 'memory',
        title: `Base de Conocimiento`,
        content: docsContent,
        summary: `Índice de proyectos y conocimiento de ${displayName}`,
        priority: 5,
        userId,
      });
      await this.memoriesRepository.save(docsMemory);
      console.log(`[MemoryService] Memoria DOCS creada para usuario ${userId}`);
    }

    console.log(`[MemoryService] Memorias inicializadas para usuario ${userId}`);
  }

  /**
   * Actualiza la memoria INDEX con información de un proyecto
   */
  private async updateIndexWithProject(project: Memory, userId: number): Promise<void> {
    try {
      const indexMemory = await this.memoriesRepository.findOne({
        where: { slug: 'index', userId },
      });

      if (!indexMemory) {
        console.warn(`[MemoryService] No se encontró memoria INDEX para usuario ${userId}`);
        return;
      }

      // Verificar si el proyecto ya está en el index
      if (indexMemory.content.includes(`### ${this.formatProjectTitle(project.title)}`)) {
        console.log(`[MemoryService] Proyecto ${project.slug} ya existe en INDEX`);
        return;
      }

      // Extraer tecnologías del contenido del proyecto
      const techMatches = project.content?.match(/\*\*(?:Stack|Tecnolog[íi]as?):\*\*\s*([^\n]+)/i);
      const techStack = techMatches ? techMatches[1].trim() : 'Varias tecnologías';

      // Crear entrada del proyecto
      const projectEntry = `

### ${this.formatProjectTitle(project.title)}

${project.summary || 'Proyecto sin descripción'}

- **Stack:** ${techStack}
- **Comando:** \`cat projects/${project.slug}.md\`
`;

      // Insertar antes de la línea de separación final
      const insertPoint = indexMemory.content.lastIndexOf('---\n\nDocumento');
      if (insertPoint !== -1) {
        indexMemory.content = 
          indexMemory.content.slice(0, insertPoint) + 
          projectEntry + 
          '\n' + 
          indexMemory.content.slice(insertPoint);
      } else {
        // Agregar al final si no encuentra el patrón
        indexMemory.content += projectEntry;
      }

      await this.memoriesRepository.save(indexMemory);
      console.log(`[MemoryService] INDEX actualizado con proyecto ${project.slug}`);
    } catch (error) {
      console.error(`[MemoryService] Error actualizando INDEX:`, error);
    }
  }
}
