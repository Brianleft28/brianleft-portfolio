import type { RequestHandler } from './$types';

/**
 * Sitemap dinámico. Antes era `static/sitemap.xml` con una sola URL (la home),
 * así que para Google el sitio era una página. Ahora lista la home + una entrada
 * por proyecto (`/proyectos/[slug]`), tomando los slugs de `/memories/summaries`
 * (público). El archivo estático se borró: los assets de `static/` ganan sobre
 * las rutas, y si quedaba, este endpoint nunca se servía.
 */
export const GET: RequestHandler = async ({ fetch, url }) => {
	const origin = `${url.protocol}//${url.host}`;
	const today = new Date().toISOString().slice(0, 10);

	let slugs: string[] = [];
	try {
		const res = await fetch('/api/memories/summaries');
		if (res.ok) {
			const summaries = await res.json();
			if (Array.isArray(summaries)) {
				slugs = summaries.map((s: { slug: string }) => s.slug).filter(Boolean);
			}
		}
	} catch {
		// Si el backend no responde, al menos sale la home.
	}

	const urls = [
		{ loc: `${origin}/`, priority: '1.0' },
		...slugs.map((slug) => ({ loc: `${origin}/proyectos/${slug}`, priority: '0.8' }))
	];

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		urls
			.map(
				(u) =>
					`  <url>\n` +
					`    <loc>${u.loc}</loc>\n` +
					`    <lastmod>${today}</lastmod>\n` +
					`    <changefreq>monthly</changefreq>\n` +
					`    <priority>${u.priority}</priority>\n` +
					`  </url>`
			)
			.join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
