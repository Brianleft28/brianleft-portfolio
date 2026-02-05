import { get } from 'svelte/store';
import { _, locale } from 'svelte-i18n';

/**
 * Obtiene una traducción de forma sincrónica.
 * Útil para archivos .ts que no pueden usar la sintaxis reactiva de Svelte.
 */
export function t(key: string, values?: Record<string, unknown>): string {
	const translate = get(_);
	return translate(key, { values }) as string;
}

/**
 * Obtiene el idioma actual
 */
export function getCurrentLocale(): string {
	return get(locale) || 'es';
}

/**
 * Cambia el idioma
 */
export function setLocale(lang: string): void {
	locale.set(lang);
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('portfolio-locale', lang);
	}
}
