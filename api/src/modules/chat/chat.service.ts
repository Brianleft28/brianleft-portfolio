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
  private models = new Map<string, GenerativeModel>();
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
      this.logger.error('GEMINI_API_KEY no configurada: el asistente no va a poder responder.');
    }
  }

  /**
   * Cadena de modelos a usar, en orden de preferencia.
   *
   * La cuota del free tier de Gemini es **por modelo**: cuando el primero
   * devuelve 429 el siguiente suele tener saldo. Sin esta cadena, agotar la
   * cuota del modelo principal dejaba el asistente muerto hasta el día
   * siguiente por más que reintentáramos.
   */
  private getModelChain(): string[] {
    const primary = this.configService.get('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
    const fallbacks = (this.configService.get('GEMINI_MODEL_FALLBACK') || '')
      .split(',')
      .map((m: string) => m.trim())
      .filter(Boolean);

    return [...new Set([primary, ...fallbacks])];
  }

  private getModelFor(name: string): GenerativeModel | null {
    if (!this.defaultApiKey) return null;

    const cached = this.models.get(name);
    if (cached) return cached;

    try {
      const genAI = new GoogleGenerativeAI(this.defaultApiKey);
      const model = genAI.getGenerativeModel({ model: name });
      this.models.set(name, model);
      return model;
    } catch (error) {
      this.logger.error(`Error inicializando modelo "${name}": ${error.message}`);
      return null;
    }
  }

  /**
   * Genera una respuesta de chat con streaming
   * @param prompt El mensaje del usuario
   * @param mode Modo de personalidad: 'arquitecto' o 'asistente'
   * @param userId ID del usuario (default: 1 para admin)
   * @param locale Idioma de la interfaz del visitante (`es`, `en`)
   */
  async *chat(
    prompt: string,
    mode?: string,
    userId: number = 1,
    locale?: string,
  ): AsyncGenerator<string> {
    if (!this.defaultApiKey) {
      this.logger.error('Chat solicitado sin GEMINI_API_KEY configurada.');
      yield 'El asistente no está disponible en este momento.';
      return;
    }

    try {
      // Detectar si pide lista de proyectos
      const isListRequest = this.isProjectListRequest(prompt);

      // Obtener contexto relevante
      const context = await this.buildContext(prompt, isListRequest, userId);

      // Construir prompt completo (ahora es async, con modo)
      const fullPrompt = await this.buildFullPrompt(prompt, context, isListRequest, mode, userId, locale);

      // Generar respuesta con streaming
      const result = await this.startStream(fullPrompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error(`Error en chat: ${error.message}`);

      // Nada de esto es culpa del visitante ni algo que pueda accionar:
      // la key y el modelo son del servidor. Mensajes claros, sin stack traces.
      if (this.isOutOfQuota(error)) {
        yield 'El asistente agotó su cupo diario de consultas. Vuelve a estar disponible mañana.';
      } else if (this.isOverloaded(error)) {
        yield 'El asistente está saturado en este momento. Probá de nuevo en unos segundos.';
      } else if (error.message?.includes('API key') || error.message?.includes('401')) {
        yield 'El asistente no está disponible en este momento.';
      } else {
        yield 'No pude procesar tu mensaje. Probá de nuevo.';
      }
    }
  }

  /**
   * Arranca el stream, recorriendo la cadena de modelos.
   *
   * Por cada modelo se reintenta ante saturación (503, transitoria). Ante cuota
   * agotada (429) no tiene sentido insistir: se salta directo al siguiente
   * modelo, que tiene su propio cupo. Se reintenta sólo el arranque; una vez que
   * el stream empezó a emitir, reiniciarlo duplicaría texto.
   */
  private async startStream(prompt: string) {
    const chain = this.getModelChain();
    let lastError: any;

    for (const name of chain) {
      const model = this.getModelFor(name);
      if (!model) continue;

      const attempts = this.isOutOfQuota(lastError) ? 1 : 2;

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await model.generateContentStream(prompt);
        } catch (error) {
          lastError = error;

          if (this.isOutOfQuota(error)) {
            this.logger.warn(`Cuota agotada en "${name}", pasando al siguiente modelo.`);
            break; // otro intento con el mismo modelo daría el mismo 429
          }

          if (!this.isOverloaded(error) || attempt === attempts) break;

          this.logger.warn(`"${name}" saturado (intento ${attempt}/${attempts}), reintentando.`);
          await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
        }
      }
    }

    throw lastError;
  }

  /** 429: se acabó el cupo del modelo. Reintentar no ayuda, cambiar de modelo sí. */
  private isOutOfQuota(error: any): boolean {
    const message = String(error?.message ?? '');
    return message.includes('429') || message.toLowerCase().includes('quota');
  }

  /** 503: congestión transitoria del lado de Google. Reintentar suele alcanzar. */
  private isOverloaded(error: any): boolean {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes('503') ||
      message.includes('overloaded') ||
      message.includes('high demand') ||
      message.includes('unavailable')
    );
  }

  /**
   * Genera un resumen estructurado de un contenido
   */
  async generateSummary(content: string): Promise<string> {
    const model = this.getModelFor(this.getModelChain()[0]);
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

    // Buscar memorias relevantes adicionales.
    // Ojo: esto corre también para `isListRequest`. Antes ese branch devolvía
    // sólo `memory` (los resúmenes de proyectos), así que un "listame los
    // comandos" se quedaba sin la referencia real y el modelo la inventaba.
    const memories = await this.memoryService.findRelevant(prompt, userId);

    if (isListRequest) {
      const extra = memories.map((m) => m.content).join('\n\n---\n\n');
      return extra ? `${baseContext}\n\n---\n\n${extra}` : baseContext;
    }

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
    locale?: string,
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
    const languageInstruction = this.getLanguageInstruction(personality?.language, locale);
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
   * Instrucción de idioma.
   *
   * El contenido del portfolio (perfil, READMEs de proyectos, portada) está
   * escrito una sola vez, en español. En vez de duplicar cada documento por
   * idioma, la traducción la hace el modelo al responder: se le pide que
   * espeje el idioma del visitante.
   *
   * @param language variante configurada en la personalidad, para el caso por defecto
   * @param preferredLocale idioma de la interfaz del visitante (`es`, `en`), si se conoce
   */
  private getLanguageInstruction(language?: string, preferredLocale?: string): string {
    const defaultVariants: Record<string, string> = {
      'es-AR': 'español argentino (vos, usás, tenés), natural pero profesional',
      'es-ES': 'español de España (tú, usas, tienes), formal y profesional',
      'en-US': 'American English, professional and clear',
      'pt-BR': 'português brasileiro, profissional e claro',
    };
    const fallback = defaultVariants[language || 'es-AR'] || defaultVariants['es-AR'];

    const preference = preferredLocale
      ? `\n- La interfaz del visitante está en "${preferredLocale}": ante la duda, usá ese idioma.`
      : '';

    return `\n## IDIOMA
- Respondé SIEMPRE en el mismo idioma en que te escribieron. Si te preguntan en inglés, respondé en inglés; en portugués, en portugués.${preference}
- Si no hay señal clara, usá ${fallback}.
- El material que leés está en español. Traducilo al responder: no lo copies tal cual ni te disculpes por el idioma de las fuentes.
- Los nombres propios, slugs y comandos no se traducen.`;
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
