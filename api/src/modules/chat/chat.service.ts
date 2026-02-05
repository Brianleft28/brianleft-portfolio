import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../../entities/memory.entity';
import { AiPersonalitiesService } from '../ai-personalities/ai-personalities.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../entities/setting.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private defaultApiKey: string | null = null;

  constructor(
    private configService: ConfigService,
    private memoryService: MemoryService,
    private aiPersonalitiesService: AiPersonalitiesService,
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {
    this.defaultApiKey = this.configService.get('GEMINI_API_KEY') || null;
    if (!this.defaultApiKey) {
      this.logger.warn('GEMINI_API_KEY del servidor no configurada - se requiere key del usuario');
    } else {
      this.initializeModel(this.defaultApiKey);
    }
  }

  /**
   * Inicializa el modelo con una API key específica
   */
  private initializeModel(apiKey: string): GenerativeModel | null {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (error) {
      this.logger.error(`Error inicializando modelo: ${error.message}`);
      return null;
    }
  }

  /**
   * Obtiene el modelo a usar (con key del usuario o del servidor)
   */
  private getModel(userApiKey?: string): GenerativeModel | null {
    // Si el usuario proporciona su propia key, usarla
    if (userApiKey && userApiKey.length > 20) {
      return this.initializeModel(userApiKey);
    }

    // Si no hay modelo por defecto pero tenemos la key, inicializarlo
    if (!this.model && this.defaultApiKey) {
      this.model = this.initializeModel(this.defaultApiKey);
    }

    return this.model;
  }

  /**
   * Genera una respuesta de chat con streaming
   * @param prompt El mensaje del usuario
   * @param userApiKey API key opcional del usuario (de localStorage)
   * @param mode Modo de personalidad: 'arquitecto' o 'asistente'
   * @param userId ID del usuario (default: 1 para admin)
   */
  async *chat(prompt: string, userApiKey?: string, mode?: string, userId: number = 1): AsyncGenerator<string> {
    const model = this.getModel(userApiKey);

    if (!model) {
      yield 'Error: No hay API key de Gemini configurada.\n\nUsa el comando `apikey set TU_KEY` para configurar tu propia API key de Gemini.\nPodés obtener una gratis en: https://aistudio.google.com/apikey';
      return;
    }

    try {
      // Detectar si pide lista de proyectos
      const isListRequest = this.isProjectListRequest(prompt);

      // Obtener contexto relevante
      const context = await this.buildContext(prompt, isListRequest, userId);

      // Construir prompt completo (ahora es async, con modo)
      const fullPrompt = await this.buildFullPrompt(prompt, context, isListRequest, mode, userId);

      // Generar respuesta con streaming
      const result = await model.generateContentStream(fullPrompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error(`Error en chat: ${error.message}`);

      // Mensaje más descriptivo si es error de API key
      if (error.message?.includes('API key') || error.message?.includes('401')) {
        yield 'Error: API key inválida o expirada.\n\nVerificá tu key con `apikey show` o configurá una nueva con `apikey set TU_KEY`';
      } else {
        yield `Error al procesar tu mensaje: ${error.message}`;
      }
    }
  }

  /**
   * Genera un resumen estructurado de un contenido
   */
  async generateSummary(content: string): Promise<string> {
    const model = this.getModel();
    if (!model) {
      return 'Resumen no disponible (API key no configurada)';
    }

    const prompt = `Genera un resumen técnico de 2-3 oraciones sobre este proyecto.
El resumen debe mencionar: qué problema resuelve, tecnologías principales y resultado.
Sé conciso y profesional.

CONTENIDO:
${content}

RESUMEN:`;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      this.logger.error(`Error generando resumen: ${error.message}`);
      return 'Resumen no disponible';
    }
  }

  /**
   * Detecta si el prompt pide lista de proyectos
   */
  private isProjectListRequest(prompt: string): boolean {
    const listKeywords = [
      'proyectos',
      'lista',
      'listar',
      'cuáles',
      'cuales',
      'qué proyectos',
      'que proyectos',
      'mostrar proyectos',
      'ver proyectos',
      'todos los proyectos',
    ];

    const promptLower = prompt.toLowerCase();
    return listKeywords.some((keyword) => promptLower.includes(keyword));
  }

  /**
   * Construye el contexto para el prompt
   * Usa memory.md como fuente principal de conocimiento sobre proyectos
   */
  private async buildContext(prompt: string, isListRequest: boolean, userId: number): Promise<string> {
    // SIEMPRE cargar memory.md como base de conocimiento
    const memoryDoc = await this.memoryService.findBySlug('memory', userId);
    const baseContext = memoryDoc?.content || '';

    if (isListRequest) {
      // Para listas de proyectos, usar memory.md que tiene todos los resúmenes
      return baseContext;
    }

    // Buscar memorias relevantes adicionales
    const memories = await this.memoryService.findRelevant(prompt, userId);

    if (memories.length === 0) {
      // Si no hay match específico, usar memory.md + meta
      const metaMemory = await this.memoryService.findByType(MemoryType.META, userId);
      const metaContext = metaMemory.map((m) => m.content).join('\n\n');
      return `${baseContext}\n\n---\n\n${metaContext}`;
    }

    // Combinar memory.md con memorias específicas encontradas
    const specificContext = memories.map((m) => m.content).join('\n\n---\n\n');
    return `${baseContext}\n\n---\n\n${specificContext}`;
  }

  /**
   * Construye el prompt completo con sistema + contexto + usuario
   * Usa la personalidad configurada en la BD según el modo
   * Reemplaza placeholders con valores de settings
   */
  private async buildFullPrompt(
    userPrompt: string,
    context: string,
    isListRequest: boolean,
    mode?: string,
    userId: number = 1,
  ): Promise<string> {
    // Cargar settings para placeholders (del usuario específico)
    const settings = await this.settingsRepository.find({ where: { userId } });
    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    // Variables del owner
    const ownerFirstName = settingsMap.get('owner_first_name') || '';
    const ownerLastName = settingsMap.get('owner_last_name') || '';
    const ownerName = settingsMap.get('owner_name') || `${ownerFirstName} ${ownerLastName}`.trim() || 'Usuario';
    const ownerRole = settingsMap.get('owner_role') || 'Developer';
    const ownerRoleShort = settingsMap.get('owner_role_short') || 'Dev';
    const ownerLocation = settingsMap.get('owner_location') || '';
    const ownerEmail = settingsMap.get('owner_email') || '';
    const ownerBio = settingsMap.get('owner_bio') || '';
    const ownerPhilosophy = settingsMap.get('owner_philosophy') || '';
    const contactAvailability = settingsMap.get('contact_availability') || 'Disponible para nuevos proyectos';
    
    // Social links
    const socialGithub = settingsMap.get('social_github') || '';
    const socialLinkedin = settingsMap.get('social_linkedin') || '';
    
    // Variables del AI
    const aiName = settingsMap.get('ai_name') || 'Asistente IA';
    const aiCommand = settingsMap.get('ai_command') || 'ask';
    const aiGreeting = settingsMap.get('ai_greeting') || '';
    
    // Variables del sitio
    const siteTitle = settingsMap.get('branding_site_title') || 'Portfolio';
    const siteDescription = settingsMap.get('branding_site_description') || '';

    // Obtener personalidad según el modo o la activa por default (del usuario)
    let personality;
    if (mode) {
      personality = await this.aiPersonalitiesService.findByMode(mode, userId);
    }
    if (!personality) {
      personality = await this.aiPersonalitiesService.findActive(userId);
    }

    // Usar el system prompt de la personalidad o un fallback razonable
    let baseSystemPrompt =
      personality?.systemPrompt ||
      `## IDENTIDAD

Sos un asistente del portfolio de ${ownerName}. 

## ROL

Tu propósito es ayudar a los visitantes a conocer:
- La experiencia y habilidades de ${ownerName}
- Los proyectos documentados en el portfolio
- Cómo contactar a ${ownerName}

## LINEAMIENTOS

1. Respondé en español argentino
2. Sé profesional y accesible
3. Priorizá hablar del portfolio y proyectos
4. Si no tenés información sobre algo, indicalo amablemente`;

    // Reemplazar TODOS los placeholders disponibles en system prompt
    baseSystemPrompt = baseSystemPrompt
      // Owner
      .replace(/\{\{owner_name\}\}/g, ownerName)
      .replace(/\{\{owner_first_name\}\}/g, ownerFirstName)
      .replace(/\{\{owner_last_name\}\}/g, ownerLastName)
      .replace(/\{\{owner_role\}\}/g, ownerRole)
      .replace(/\{\{owner_role_short\}\}/g, ownerRoleShort)
      .replace(/\{\{owner_location\}\}/g, ownerLocation)
      .replace(/\{\{owner_email\}\}/g, ownerEmail)
      .replace(/\{\{owner_bio\}\}/g, ownerBio)
      .replace(/\{\{owner_philosophy\}\}/g, ownerPhilosophy)
      .replace(/\{\{contact_availability\}\}/g, contactAvailability)
      // Social
      .replace(/\{\{social_github\}\}/g, socialGithub)
      .replace(/\{\{social_linkedin\}\}/g, socialLinkedin)
      // AI
      .replace(/\{\{ai_name\}\}/g, aiName)
      .replace(/\{\{ai_command\}\}/g, aiCommand)
      .replace(/\{\{ai_greeting\}\}/g, aiGreeting)
      // Site
      .replace(/\{\{site_title\}\}/g, siteTitle)
      .replace(/\{\{site_description\}\}/g, siteDescription);

    // Inyectar configuración adicional de la personalidad
    const languageInstruction = this.getLanguageInstruction(personality?.language);
    const voiceStyleInstruction = this.getVoiceStyleInstruction(personality?.voiceStyle || undefined);
    const traitsInstruction = personality?.traits?.length
      ? `\n## RASGOS DE PERSONALIDAD (MUY IMPORTANTE)\nESTOS RASGOS DEFINEN TU FORMA DE RESPONDER. Debés aplicarlos en CADA respuesta:\n${personality.traits.map(t => `- ${t.toUpperCase()}: Incorporá este rasgo activamente`).join('\n')}\n\nSi un rasgo es "sarcástico", usá sarcasmo. Si es "directo", sé muy directo. NUNCA ignores estos rasgos.`
      : '';

    // Formato restrictivo para terminal
    const systemPrompt = `${baseSystemPrompt}
${traitsInstruction}
${voiceStyleInstruction}
${languageInstruction}

FORMATO DE RESPUESTA (MUY IMPORTANTE)
- NUNCA uses headers markdown (# o ##). Esto es una terminal, no un documento.
- Usá texto plano con saltos de línea para separar secciones
- Usá listas con viñetas (• o -) para enumerar
- Usá \`código inline\` solo para términos técnicos específicos
- Podés usar **negritas** para énfasis
- Para diagramas, usá ASCII art o Mermaid
- Mantené respuestas concisas y directas
- Si listás proyectos, usá formato: "• NombreProyecto: descripción breve"

${isListRequest ? 'INSTRUCCIÓN: El usuario pide lista de proyectos. Mostralos de forma organizada, sin headers, con viñetas.' : ''}

CONTEXTO (BASE DE CONOCIMIENTO)
${context}

PREGUNTA DEL USUARIO
${userPrompt}

TU RESPUESTA (sin headers, formato terminal):`;

    return systemPrompt;
  }

  /**
   * Obtiene la instrucción de idioma según el código
   */
  private getLanguageInstruction(language?: string): string {
    const instructions: Record<string, string> = {
      'es-AR': '\n## IDIOMA\nRespondé en español argentino (vos, usás, tenés). Sé natural pero profesional.',
      'es-ES': '\n## IDIOMA\nResponde en español de España (tú, usas, tienes). Sé formal y profesional.',
      'en-US': '\n## LANGUAGE\nRespond in American English. Be professional and clear.',
      'pt-BR': '\n## IDIOMA\nResponda em português brasileiro. Seja profissional e claro.',
    };
    return instructions[language || 'es-AR'] || instructions['es-AR'];
  }

  /**
   * Obtiene la instrucción de estilo de voz
   */
  private getVoiceStyleInstruction(voiceStyle?: string): string {
    const instructions: Record<string, string> = {
      'technical': '\n## ESTILO\nUsá un tono técnico y preciso. Incluí detalles de implementación cuando corresponda.',
      'technical-focused': '\n## ESTILO\nUsá un tono muy técnico y analítico. Enfocate en arquitectura y decisiones de diseño.',
      'professional': '\n## ESTILO\nUsá un tono profesional y equilibrado. Sé accesible pero mantenete técnico.',
      'formal': '\n## ESTILO\nUsá un tono formal y estructurado. Documentación clara y organizada.',
      'friendly': '\n## ESTILO\nUsá un tono amable y accesible. Explicá las cosas de forma didáctica.',
      'casual': '\n## ESTILO\nUsá un tono casual pero informativo. Sé directo y conversacional.',
    };
    return instructions[voiceStyle || 'professional'] || instructions['professional'];
  }
}
