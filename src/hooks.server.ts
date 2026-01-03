import type { Handle } from '@sveltejs/kit';

/**
 * Este hook se ejecuta en cada petición al servidor.
 * Su propósito es leer el idioma guardado en las cookies del navegador.
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Lee el valor de la cookie 'lang'. Si no existe, usa 'ES' como predeterminado.
	const lang = event.cookies.get('lang') || 'ES';

	// Pasa el idioma al transformador de HTML de SvelteKit.
	// Esto reemplazará el placeholder %sveltekit.lang% en app.html con el valor de 'lang'.
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%sveltekit.lang%', lang)
	});
};
