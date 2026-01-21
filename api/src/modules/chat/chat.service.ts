import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MemoryService } from '../memory/memory.service';
import { MemoryType } from '../../entities/memory.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private configService: ConfigService,
    private memoryService: MemoryService,
  ) {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY no configurada');
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Genera una respuesta de chat con streaming
   */
  async *chat(prompt: string): AsyncGenerator<string> {
    if (!this.model) {
      yield 'Error: API de Gemini no configurada correctamente.';
      return;
    }

    try {
      // Detectar si pide lista de proyectos
      const isListRequest = this.isProjectListRequest(prompt);

      // Obtener contexto relevante
      const context = await this.buildContext(prompt, isListRequest);

      // Construir prompt completo
      const fullPrompt = this.buildFullPrompt(prompt, context, isListRequest);

      // Generar respuesta con streaming
      const result = await this.model.generateContentStream(fullPrompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error(`Error en chat: ${error.message}`);
      yield `Error al procesar tu mensaje: ${error.message}`;
    }
  }

  /**
   * Genera un resumen estructurado de un contenido
   */
  async generateSummary(content: string): Promise<string> {
    if (!this.model) {
      return 'Resumen no disponible';
    }

    const prompt = `Genera un resumen técnico de 2-3 oraciones sobre este proyecto.
El resumen debe mencionar: qué problema resuelve, tecnologías principales y resultado.
Sé conciso y profesional.

CONTENIDO:
${content}

RESUMEN:`;

    try {
      const result = await this.model.generateContent(prompt);
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
   */
  private async buildContext(prompt: string, isListRequest: boolean): Promise<string> {
    if (isListRequest) {
      // Para listas, usar resúmenes
      const summaries = await this.memoryService.getProjectSummaries();
      return summaries
        .map((s) => `## ${s.title}\n${s.summary}`)
        .join('\n\n');
    }

    // Buscar memorias relevantes
    const memories = await this.memoryService.findRelevant(prompt);

    if (memories.length === 0) {
      // Si no hay match, cargar contexto base
      const baseMemories = await Promise.all([
        this.memoryService.findByType(MemoryType.INDEX),
        this.memoryService.findByType(MemoryType.META),
      ]);

      return baseMemories
        .flat()
        .map((m) => m.content)
        .join('\n\n---\n\n');
    }

    return memories.map((m) => m.content).join('\n\n---\n\n');
  }

  /**
   * Construye el prompt completo con sistema + contexto + usuario
   */
  private buildFullPrompt(
    userPrompt: string,
    context: string,
    isListRequest: boolean,
  ): string {
    const systemPrompt = `## IDENTIDAD
Sos TorvaldsAi, el asistente técnico del portfolio de Brian Benegas.
Tu personalidad está inspirada en Linus Torvalds: directo, técnico, pragmático, 
ocasionalmente sarcástico pero siempre útil.

## REGLAS
1. Respondé siempre en español argentino rioplatense (vos, tenés, etc.)
2. Sé técnico y preciso, pero accesible
3. Usá Markdown para formatear (código, listas, tablas)
4. Si no sabés algo, decilo honestamente
5. Mantené las respuestas concisas pero completas
6. Para código, usá bloques con el lenguaje específico

## FORMATO DE RESPUESTA
- Usá headers (##) para secciones
- Usá listas para enumerar
- Usá \`código inline\` para términos técnicos
- Usá bloques de código con syntax highlighting
- Para arquitectura, podés usar diagramas ASCII

${isListRequest ? '## INSTRUCCIÓN ESPECIAL\nEl usuario pide una lista de proyectos. Mostrá los proyectos de forma organizada con nombre y descripción breve.' : ''}

## CONTEXTO
${context}

## PREGUNTA DEL USUARIO
${userPrompt}

## TU RESPUESTA`;

    return systemPrompt;
  }
}
