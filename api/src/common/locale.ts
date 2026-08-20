/**
 * Idiomas del portfolio.
 *
 * El contenido se escribe en español y se traduce a inglés en
 * `${MEMORY_PATH}/en/**`; todo lo que no tenga traducción cae al español.
 */
export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';

/** `en-US`, `EN`, `en` → `en`. Cualquier otra cosa → español. */
export function normalizeLocale(value?: string | null): Locale {
  const code = value?.split('-')[0]?.toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(code ?? '')
    ? (code as Locale)
    : DEFAULT_LOCALE;
}
