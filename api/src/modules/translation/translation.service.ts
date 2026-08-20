import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Traducción es → en del contenido que se carga desde el panel.
 *
 * Lo que está versionado en el repo se traduce offline con
 * `npm run translate` (`scripts/translate-docs.ts`), que deja el resultado en
 * `${MEMORY_PATH}/en/**` para que se pueda revisar antes de publicarlo. Pero un
 * proyecto cargado desde `/admin/projects` no pasa por ahí: sin esto quedaría
 * con `content_en` en `null` para siempre y el visitante en inglés lo vería en
 * español.
 *
 * Nunca tira: si falla, devuelve `null` y el contenido se sirve en español, que
 * es exactamente el fallback que ya tiene todo el sistema.
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Modelo de traducción, deliberadamente fuera de la cadena del chat
   * (`GEMINI_MODEL` + `GEMINI_MODEL_FALLBACK`): el free tier tiene cupo diario
   * por modelo, y traducir no le tiene que comer el cupo al asistente.
   */
  private get model(): string {
    return this.configService.get('TRANSLATE_MODEL') || 'gemini-3.5-flash';
  }

  private readonly markdownRules = `Sos un traductor técnico. Traducís del español al inglés documentación de un portfolio de desarrollo de software.

REGLAS:
- Devolvés el markdown traducido y NADA más: sin explicaciones, sin envolverlo en bloques de código.
- No agregues, resumas ni completes contenido. Lo que no está en el original no existe.
- No agregues frontmatter YAML si el original no lo tiene.
- NO traducís: slugs, nombres de comandos, rutas de archivo, nombres de tecnologías, nombres propios ni identificadores de código.
- Dentro de los bloques de código no tocás el código; sí traducís los comentarios y el texto en lenguaje natural que se le pasa a un comando.
- Mantenés la estructura markdown exacta y los placeholders {{como_este}} literales.
- Inglés profesional y natural.

TEXTO:
`;

  /** Markdown traducido, o `null` si no se pudo. */
  async toEnglish(content: string): Promise<string | null> {
    if (!content?.trim()) return null;
    return this.ask(this.markdownRules + content);
  }

  /** Una línea suelta —un título, un resumen—, sin formato markdown. */
  async lineToEnglish(text: string): Promise<string | null> {
    if (!text?.trim()) return null;
    return this.ask(
      'Traducí al inglés este texto de un portfolio de software. Devolvé sólo la traducción, ' +
        'sin comillas ni explicaciones. No traduzcas nombres propios ni de tecnologías.\n\n' +
        text,
    );
  }

  private async ask(prompt: string): Promise<string | null> {
    const apiKey = this.configService.get('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('Sin GEMINI_API_KEY: el contenido queda sin traducir.');
      return null;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) return null;

      // Por si devuelve el texto envuelto en un bloque de código.
      return text
        .replace(/^```(?:markdown|md)?\s*\n/, '')
        .replace(/\n```\s*$/, '')
        .trim();
    } catch (error) {
      // El error de Google trae el payload entero de la cuota: en el log del
      // contenedor son treinta líneas por cada texto que no se pudo traducir.
      const detail = String(error?.message ?? '').split('\n')[0].slice(0, 160);
      this.logger.warn(`Sin traducir ("${this.model}"): ${detail}`);
      return null;
    }
  }
}
