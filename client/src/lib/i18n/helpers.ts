/**
 * Los comandos de la terminal importan desde acá por historia. La
 * implementación vive en `./index.ts`, que además es el módulo que corre
 * `init()`: importar helpers garantiza que i18n esté inicializado.
 */
export { t, getCurrentLocale, setLocale, normalizeLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './index';
