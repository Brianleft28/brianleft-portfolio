import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { init, register, getLocaleFromNavigator, locale, _ } from 'svelte-i18n';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;
export const DEFAULT_LOCALE = 'es';

/** Misma clave en localStorage y en la cookie: el cliente lee una, el server la otra. */
export const LOCALE_KEY = 'portfolio-locale';

// Registrar los idiomas disponibles. Son `import()` dinámicos: el diccionario
// llega de forma asíncrona y hasta que llega `$locale` vale `null`.
register('es', () => import('./locales/es.json'));
register('en', () => import('./locales/en.json'));

/** Normaliza `en-US`, `ES`, `es-AR` a un idioma soportado, o `null`. */
export function normalizeLocale(value?: string | null): string | null {
	const code = value?.split('-')[0]?.toLowerCase();
	return code && SUPPORTED_LOCALES.includes(code as never) ? code : null;
}

function fromStorage(): string | null {
	try {
		return normalizeLocale(localStorage.getItem(LOCALE_KEY));
	} catch {
		return null; // localStorage bloqueado (modo privado, cookies de terceros)
	}
}

function fromCookie(): string | null {
	const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_KEY}=([^;]*)`));
	return match ? normalizeLocale(decodeURIComponent(match[1])) : null;
}

/**
 * Idioma efectivo: lo que el visitante eligió, y si nunca eligió, el de su
 * navegador. En el server no hay ninguna de las dos cosas: el idioma llega por
 * cookie desde `hooks.server.ts` y lo aplica `+layout.ts`.
 */
export function getSavedLocale(): string {
	if (!browser) return DEFAULT_LOCALE;
	return fromStorage() ?? fromCookie() ?? normalizeLocale(getLocaleFromNavigator()) ?? DEFAULT_LOCALE;
}

/**
 * Un solo `init()`, con el idioma definitivo.
 *
 * Antes se llamaba a `init()` con un idioma y acto seguido a `locale.set()` con
 * otro: dos descargas de diccionario encoladas, y una ventana más larga con
 * `$locale` en `null` en la que cualquier `t()` tiraba
 * "Cannot format a message without first setting the initial locale".
 */
init({
	fallbackLocale: DEFAULT_LOCALE,
	initialLocale: getSavedLocale()
});

/**
 * Traducción sincrónica, para los `.ts` que no pueden usar `$t`.
 *
 * Nunca tira: si la llaman antes de que el diccionario esté cargado devuelve la
 * clave. Con el `waitLocale()` de `+layout.ts` no debería pasar, pero un texto
 * feo es mejor que una excepción que se lleva puesta la terminal.
 */
export function t(key: string, values?: Record<string, string | number | boolean | Date>): string {
	if (get(locale) == null) {
		console.warn(`[i18n] t("${key}") antes de que cargara el diccionario.`);
		return key;
	}
	return get(_)(key, { values }) as string;
}

/** Idioma actual, ya resuelto. */
export function getCurrentLocale(): string {
	return get(locale) || DEFAULT_LOCALE;
}

/**
 * Cambia el idioma y lo persiste.
 *
 * Es la **única** implementación: antes había tres (acá, en `helpers.ts` y una
 * inline en `+layout.svelte` que leía `$locale` después de setearlo y podía
 * guardar el idioma anterior).
 *
 * Guarda en localStorage *y* en cookie: la cookie es la que ve el server, y sin
 * ella el SSR renderiza siempre en español y el visitante en inglés se come un
 * flash de idioma equivocado antes de hidratar.
 */
export async function setLocale(lang: string): Promise<void> {
	const next = normalizeLocale(lang) ?? DEFAULT_LOCALE;

	// `locale.set()` devuelve una promesa mientras descarga el diccionario. Sin
	// esperarla, el mensaje que confirma el cambio se arma todavía en el idioma
	// anterior.
	await locale.set(next);

	if (!browser) return;

	try {
		localStorage.setItem(LOCALE_KEY, next);
	} catch {
		// Sin localStorage la cookie alcanza.
	}
	document.cookie = `${LOCALE_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export { locale };
