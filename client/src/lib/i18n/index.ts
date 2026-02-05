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

// Función para obtener el idioma guardado
export function getSavedLocale(): string {
	if (browser) {
		return localStorage.getItem('portfolio-locale') || 'es';
	}
	return 'es';
}

// Inicializar con el idioma guardado
if (browser) {
	const savedLocale = getSavedLocale();
	locale.set(savedLocale);
}
