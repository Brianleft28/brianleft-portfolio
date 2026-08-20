import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Página propia por proyecto: `/proyectos/[slug]`.
 *
 * Existe por SEO. La home es una sola URL; sin esto, para Google el sitio es una
 * página y los proyectos viven sólo dentro de la terminal virtual. Con una ruta
 * SSR por proyecto, cada uno es aterrizable desde una búsqueda ("VUS llamador de
 * turnos", "portfolio RAG TypeScript") y entra al sitemap.
 *
 * El contenido sale de `GET /memories/:slug` (público en NestJS, placeholders ya
 * resueltos). Se usa el `fetch` de SvelteKit contra `/api/*`, que pasa por el
 * proxy de `hooks.server.ts` hacia el backend — el mismo camino que ya usan
 * `+layout.server.ts` y el resto de las rutas.
 */
export const load: PageServerLoad = async ({ params, fetch, locals }) => {
	const slug = params.slug;

	const res = await fetch(`/api/memories/${encodeURIComponent(slug)}`);
	if (!res.ok) {
		throw error(404, 'Proyecto no encontrado');
	}

	// OJO: `GET /memories/:slug` devuelve 200 con CUERPO VACÍO cuando el slug no
	// existe (findBySlug → null), no un 404. Un `res.json()` directo sobre body
	// vacío tira "Unexpected end of JSON input" y el 404 se convierte en 500.
	// Por eso se lee como texto y se valida antes de parsear.
	const text = await res.text();
	if (!text) {
		throw error(404, 'Proyecto no encontrado');
	}

	let memory: { type?: string; title?: string; titleEn?: string; content?: string; contentEn?: string; summary?: string; summaryEn?: string };
	try {
		memory = JSON.parse(text);
	} catch {
		throw error(404, 'Proyecto no encontrado');
	}

	// `/memories/:slug` resuelve cualquier memoria; sólo los proyectos son páginas.
	// Así `meta`, `index`, etc. no quedan expuestos como /proyectos/meta.
	if (!memory || memory.type !== 'project') {
		throw error(404, 'Proyecto no encontrado');
	}

	const en = locals.locale === 'en';
	const title: string = (en ? memory.titleEn : memory.title) || memory.title || slug;
	const content: string = (en ? memory.contentEn : memory.content) || memory.content || '';
	const summaryRaw: string = (en ? memory.summaryEn : memory.summary) || memory.summary || '';

	// Description para <meta>/og: el resumen del proyecto, acotado. NO la
	// description genérica del sitio (que describe el artefacto, no el proyecto).
	const description =
		summaryRaw.replace(/\s+/g, ' ').trim().slice(0, 155) ||
		`${title} — proyecto de ${en ? 'the portfolio' : 'el portfolio'}.`;

	return {
		project: { slug, title, content },
		// Lo consume `+layout.svelte` para sobreescribir title/description/og sólo
		// en esta ruta, sin duplicar tags (ver A4 del plan).
		seo: { title, description, type: 'article' }
	};
};
