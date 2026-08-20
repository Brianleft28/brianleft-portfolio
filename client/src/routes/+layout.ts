import { browser } from '$app/environment';
import { locale, waitLocale } from 'svelte-i18n';
import { DEFAULT_LOCALE, getSavedLocale, normalizeLocale } from '$lib/i18n';
import type { LayoutLoad } from './$types';

/**
 * Nada se renderiza antes de que el diccionario esté cargado.
 *
 * `register()` usa `import()` dinámico, así que `$locale` arranca en `null` y
 * svelte-i18n tira al formatear mientras siga así. Este `load` es el guard: se
 * espera la descarga y recién después se setea el idioma —con la cola vacía,
 * `locale.set()` es sincrónico y no deja ninguna ventana.
 *
 * En el server el idioma viene por cookie (`+layout.server.ts`); en el cliente
 * gana lo que el visitante haya elegido.
 */
export const load: LayoutLoad = async ({ data }) => {
	const preferred = browser
		? getSavedLocale()
		: (normalizeLocale(data?.locale) ?? DEFAULT_LOCALE);

	// El fallback también: si a un `.md` traducido le falta una clave, se resuelve
	// contra el diccionario español, que tiene que estar en memoria.
	await Promise.all([waitLocale(preferred), waitLocale(DEFAULT_LOCALE)]);
	locale.set(preferred);

	// `settings` viene del load del server (+layout.server.ts). Cuando existe un
	// load universal, el `data` del componente es lo que ESTE devuelve, no un merge
	// automático: hay que reenviarlo o el SSR del <title>/og: pierde la identidad.
	return { locale: preferred, settings: data?.settings, filesystem: data?.filesystem };
};
