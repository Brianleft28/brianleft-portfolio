import type { LayoutServerLoad } from './$types';

/**
 * Datos que el SSR necesita ANTES de que el cliente hidrate. Dos cosas:
 *
 * 1. `locale`: el idioma que `hooks.server.ts` resolvió (cookie o Accept-Language).
 *    Sin esto el SSR renderiza siempre en español.
 *
 * 2. `settings`: identidad y branding desde `/settings/public`. El `<title>` y los
 *    `og:` se arman en el server; si acá no llega el nombre, el HTML crudo —lo único
 *    que leen los crawlers de LinkedIn/Google, que no ejecutan JS— dice "Developer".
 *    El store del cliente vuelve a pedir lo mismo al hidratar, así que si esto falla
 *    no rompe nada: sólo cae al default.
 */
export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	let settings: Record<string, string> = {};

	try {
		// Con `lang`: el endpoint resuelve `value` contra la traducción, así el
		// `<title>` y los `og:` salen en el mismo idioma que el cuerpo de la página.
		const res = await fetch(`/api/settings/public?lang=${locals.locale}`);
		if (res.ok) {
			const raw = await res.json();
			if (Array.isArray(raw)) {
				settings = Object.fromEntries(
					raw.map((s: { key: string; value: string }) => [s.key, s.value])
				);
			}
		}
	} catch {
		// Sin settings el SSR cae a los defaults del layout. No es fatal.
	}

	// 3. `filesystem`: el contenido real. Se cargaba en `onMount`, así que el HTML
	//    servido tenía 202 caracteres de texto —todos de la interfaz— y ni el
	//    nombre del dueño. Un crawler no ejecuta JavaScript: si el árbol no viaja
	//    en el HTML, para Google el sitio no tiene contenido.
	let filesystem: unknown[] = [];

	try {
		const res = await fetch(`/api/filesystem?lang=${locals.locale}`);
		if (res.ok) {
			const raw = await res.json();
			if (Array.isArray(raw)) filesystem = raw;
		}
	} catch {
		// El cliente lo vuelve a pedir al hidratar.
	}

	return { locale: locals.locale, settings, filesystem };
};
