import { Setting } from '../entities/setting.entity';
import { DEFAULT_LOCALE, Locale } from './locale';

/**
 * Settings cuyo valor es prosa y por lo tanto se traduce.
 *
 * El resto —nombres propios, mails, URLs, nombres de comando, el banner ASCII,
 * los archivos de CV— es igual en los dos idiomas y traducirlo sólo puede
 * romperlo. La lista es explícita a propósito: es más seguro olvidarse de
 * traducir algo que traducir un nombre de usuario.
 */
export const TRANSLATABLE_SETTINGS = [
  'owner_role',
  'owner_role_short',
  'owner_philosophy',
  'owner_bio',
  'contact_availability',
  'contact_cta',
  'branding_site_title',
  'branding_site_description',
  'ai_name',
  'ai_greeting',
];

/**
 * Valor legible de un setting.
 *
 * El panel guarda algunos como JSON (`owner_bio` es `{"short":…,"long":…}`).
 * Sin esto, `{{owner_bio}}` metía las llaves y las comillas tal cual en el
 * perfil profesional — el documento que la IA usa para hablar de su dueño.
 */
export function readableValue(value: string | null | undefined): string {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return value;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const text = parsed.long || parsed.short || '';
      return typeof text === 'string' ? text : value;
    }
  } catch {
    // No era JSON: se usa tal cual.
  }

  return value;
}

/** Mapa `clave -> valor` de la parametría, en el idioma pedido. */
export function buildPlaceholders(
  settings: Setting[],
  lang: Locale = DEFAULT_LOCALE,
): Map<string, string> {
  return new Map(
    settings.map((setting) => [
      setting.key,
      readableValue(lang === 'en' ? (setting.valueEn ?? setting.value) : setting.value),
    ]),
  );
}

/** Reemplaza `{{clave}}` por su valor; deja intacto lo que no exista. */
export function applyPlaceholders(content: string, values: Map<string, string>): string {
  if (!content) return content;
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => values.get(key) ?? match);
}
