import { browser } from '$app/environment';
import { init, register, getLocaleFromNavigator, locale } from 'svelte-i18n';

// Registrar los idiomas disponibles
register('es', () => import('./locales/es.json'));
register('en', () => import('./locales/en.json'));

// Inicializar i18n
init({
	fallbackLocale: 'es',
	initialLocale: browser ? getLocaleFromNavigator()?.split('-')[0] || 'es' : 'es'
});

// Exportar funciones útiles
export { locale };

// Función para cambiar idioma
export function setLocale(lang: string) {
	locale.set(lang);
	if (browser) {
		localStorage.setItem('portfolio-locale', lang);
	}
}

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export const DEFAULT_LOCALE = 'es';

/** Idioma del navegador, si es uno de los soportados. */
function detectBrowserLocale(): string | null {
	if (!browser) return null;
	const detected = getLocaleFromNavigator()?.split('-')[0];
	return detected && SUPPORTED_LOCALES.includes(detected as never) ? detected : null;
}

/**
 * Idioma efectivo: lo que el visitante eligió con `lang`, y si nunca eligió,
 * el de su navegador.
 *
 * El `init()` de arriba ya detectaba el navegador, pero abajo se pisaba con
 * este valor, que caía a 'es' fijo: la detección no servía para nada y un
 * visitante angloparlante siempre entraba en español.
 */
export function getSavedLocale(): string {
	if (!browser) return DEFAULT_LOCALE;
	return localStorage.getItem('portfolio-locale') || detectBrowserLocale() || DEFAULT_LOCALE;
}

// Inicializar con el idioma elegido, o el del navegador
if (browser) {
	locale.set(getSavedLocale());
}
