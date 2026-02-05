import { Injectable, Logger } from '@nestjs/common';
import { FilesystemService } from '../filesystem/filesystem.service';
import { MemoryService } from '../memory/memory.service';
import { ChatService } from '../chat/chat.service';
import { MemoryType } from '../../entities/memory.entity';
import { FileType } from '../../entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Memory } from '../../entities/memory.entity';

export interface CreateProjectDto {
  name: string;
  slug: string;
  content: string;
  keywords?: string[];
  folderId?: number; // Carpeta donde crear el archivo (default: proyectos)
  techStack?: string[]; // Tecnologías usadas (se detectan automáticamente si no se envían)
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
    const detectedTech = dto.techStack || this.extractTechnologies(dto.content);
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

    // 6. Actualizar memory.md con el nuevo proyecto
    await this.updateMemoryMd(dto.name, structuredSummary, userId);
    this.logger.log(`memory.md actualizado`);

    // 7. Actualizar index.md con nuevas tecnologías y proyecto
    await this.updateIndexMd(dto.name, structuredSummary, detectedTech, userId);
    this.logger.log(`index.md actualizado`);

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
   * Actualiza memory.md agregando el nuevo proyecto a la sección de proyectos
   * Si no existe, lo crea
   */
  private async updateMemoryMd(
    projectName: string,
    summary: ProjectSummaryForMemory,
    userId: number,
  ): Promise<void> {
    let memoryDoc = await this.memoryRepository.findOne({ where: { slug: 'memory', userId } });
    
    // Si no existe, crear memoria DOCS base
    if (!memoryDoc) {
      this.logger.log('memory.md no existe, creando...');
      memoryDoc = this.memoryRepository.create({
        type: MemoryType.DOCS,
        slug: 'memory',
        title: 'Base de Conocimiento',
        content: `# Base de Conocimiento

## Proyectos

---

## [DATOS DE CONTACTO]

- Email: {{owner_email}}
- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
`,
        summary: 'Índice de proyectos y conocimiento',
        priority: 5,
        userId,
      });
      await this.memoryRepository.save(memoryDoc);
    }

    // Formato del nuevo proyecto para memory.md
    const newProjectSection = `

### ${summary.title}

- **Tipo:** ${summary.type}
- **Descripción:** ${summary.description}
- **Tech Stack:** ${summary.techStack.join(', ')}
${summary.keyFeatures.length > 0 ? '- **Características:**\n' + summary.keyFeatures.map((f) => `  - ${f}`).join('\n') : ''}`;

    // Buscar la sección de DATOS DE CONTACTO para insertar antes
    const contactSection = memoryDoc.content.indexOf('## [DATOS DE CONTACTO]');

    let updatedContent: string;
    if (contactSection !== -1) {
      // Insertar antes de DATOS DE CONTACTO
      updatedContent =
        memoryDoc.content.slice(0, contactSection) +
        newProjectSection +
        '\n\n' +
        memoryDoc.content.slice(contactSection);
    } else {
      // Si no hay sección de contacto, agregar al final
      updatedContent = memoryDoc.content + newProjectSection;
    }

    // Guardar en BD
    await this.memoryRepository.update(memoryDoc.id, { content: updatedContent });
    this.logger.log(`memory.md actualizado con proyecto: ${projectName}`);
  }

  /**
   * Actualiza index.md con nuevas tecnologías y el proyecto
   * Si no existe, lo crea
   */
  private async updateIndexMd(
    projectName: string,
    summary: ProjectSummaryForMemory,
    newTech: string[],
    userId: number,
  ): Promise<void> {
    let indexDoc = await this.memoryRepository.findOne({ where: { slug: 'index', userId } });
    
    // Si no existe, crear memoria INDEX base
    if (!indexDoc) {
      this.logger.log('index.md no existe, creando...');
      indexDoc = this.memoryRepository.create({
        type: MemoryType.INDEX,
        slug: 'index',
        title: 'Perfil Profesional',
        content: `# PERFIL PROFESIONAL — {{owner_name}}

## Identidad

- **Nombre:** {{owner_name}}
- **Rol:** {{owner_role}}
- **Ubicación:** {{owner_location}}

## Stack Tecnológico

Configurable desde /admin/settings

## Enlaces

- GitHub: {{social_github}}
- LinkedIn: {{social_linkedin}}
- Email: {{owner_email}}

## Disponibilidad

{{contact_availability}}

---

## Proyectos Destacados

`,
        summary: 'Perfil profesional',
        priority: 8,
        userId,
      });
      await this.memoryRepository.save(indexDoc);
    }

    let updatedContent = indexDoc.content;

    // 1. Agregar el proyecto a la sección de "Proyectos Destacados"
    const newProjectEntry = `

---

### ${summary.title}

- **Contexto:** ${summary.type}
- **Stack:** ${summary.techStack.join(', ')}.

${summary.description}

${summary.keyFeatures.length > 0 ? '**Características:** ' + summary.keyFeatures.join(', ') + '.' : ''}

**Preguntas sugeridas:** "háblame de ${projectName.toLowerCase()}", "cómo funciona ${projectName.toLowerCase()}", "qué tecnologías usa ${projectName.toLowerCase()}".
`;

    // Buscar el final de la sección de proyectos (antes del próximo ## que no sea de proyecto)
    // O agregar al final si no hay más secciones
    const lastProjectMatch = updatedContent.lastIndexOf('**Preguntas sugeridas:**');
    if (lastProjectMatch !== -1) {
      // Buscar el siguiente salto de línea doble después de las preguntas sugeridas
      const insertPoint = updatedContent.indexOf('\n\n---\n\n', lastProjectMatch);
      if (insertPoint !== -1 && insertPoint < updatedContent.length - 100) {
        // Hay más contenido, insertar antes de la siguiente sección
        updatedContent =
          updatedContent.slice(0, insertPoint) +
          newProjectEntry +
          updatedContent.slice(insertPoint);
      } else {
        // Agregar al final
        updatedContent += newProjectEntry;
      }
    } else {
      // No hay proyectos, agregar al final
      updatedContent += '\n\n## Proyectos Destacados' + newProjectEntry;
    }

    // 2. Agregar nuevas tecnologías al stack si no existen
    const stackSection = updatedContent.match(/## Stack Tecnológico[\s\S]*?(?=##|$)/);
    if (stackSection) {
      const existingTech = stackSection[0].toLowerCase();
      const techToAdd = newTech.filter((t) => !existingTech.includes(t.toLowerCase()));

      if (techToAdd.length > 0) {
        this.logger.log(`Nuevas tecnologías a agregar: ${techToAdd.join(', ')}`);
        // Agregar nota sobre nuevas tecnologías (no modificamos el stack principal automáticamente)
        // Esto se puede hacer más sofisticado después
      }
    }

    // Guardar en BD
    await this.memoryRepository.update(indexDoc.id, { content: updatedContent });
    this.logger.log(`index.md actualizado con proyecto: ${projectName}`);
  }

  /**
   * Extrae tecnologías del contenido
   */
  private extractTechnologies(content: string): string[] {
    const techSet = new Set<string>();

    // Patrones de tecnologías conocidas
    const techPatterns = [
      /\b(SvelteKit|Svelte)\b/gi,
      /\b(React|React\.js|ReactJS)\b/gi,
      /\b(Vue|Vue\.js|VueJS)\b/gi,
      /\b(Angular)\b/gi,
      /\b(Node\.?js|NodeJS)\b/gi,
      /\b(NestJS|Nest\.js)\b/gi,
      /\b(Express|Express\.js)\b/gi,
      /\b(TypeScript|TS)\b/gi,
      /\b(JavaScript|JS)\b/gi,
      /\b(Python)\b/gi,
      /\b(\.NET|DotNet|C#|CSharp)\b/gi,
      /\b(Docker|Dockerfile)\b/gi,
      /\b(MySQL|PostgreSQL|Postgres|MongoDB|Redis|SQLite)\b/gi,
      /\b(GraphQL|REST|RESTful)\b/gi,
      /\b(AWS|Azure|GCP|Google Cloud)\b/gi,
      /\b(WebSocket|Socket\.io)\b/gi,
      /\b(Nginx|Apache)\b/gi,
      /\b(Linux|Ubuntu|Debian)\b/gi,
      /\b(Git|GitHub|GitLab)\b/gi,
      /\b(CI\/CD|Jenkins|GitHub Actions)\b/gi,
      /\b(Axios|Fetch)\b/gi,
      /\b(ESC-POS|ZPL|Raw Printing)\b/gi,
    ];

    for (const pattern of techPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach((m) => {
          // Normalizar nombres
          let normalized = m;
          if (/node\.?js/i.test(m)) normalized = 'Node.js';
          if (/react\.?js/i.test(m)) normalized = 'React';
          if (/vue\.?js/i.test(m)) normalized = 'Vue.js';
          if (/nest\.?js/i.test(m)) normalized = 'NestJS';
          if (/express\.?js/i.test(m)) normalized = 'Express';
          if (/typescript/i.test(m)) normalized = 'TypeScript';
          if (/javascript/i.test(m)) normalized = 'JavaScript';
          if (/socket\.io/i.test(m)) normalized = 'Socket.io';
          if (/\.net|dotnet/i.test(m)) normalized = '.NET';
          if (/c#|csharp/i.test(m)) normalized = 'C#';
          if (/postgresql|postgres/i.test(m)) normalized = 'PostgreSQL';

          techSet.add(normalized);
        });
      }
    }

    return Array.from(techSet);
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
