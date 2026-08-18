/**
 * Dibujado de diagramas mermaid.
 *
 * Los docs de proyectos traen bloques ```mermaid. `marked-highlight` los pasaba
 * por highlight.js, que no conoce ese lenguaje, así que caían a `plaintext` y en
 * pantalla se veía el código fuente del diagrama en vez del diagrama.
 *
 * La librería se importa de forma dinámica a propósito: mermaid es pesado y la
 * mayoría de las vistas no tiene diagramas, así que sólo se descarga cuando hay
 * uno para dibujar.
 */

let initialized = false;

/**
 * Elige la paleta del diagrama midiendo la luminancia real del fondo, en vez de
 * mantener una lista de temas. Hay siete (`matrix`, `dracula`, `nord`…) y el
 * visitante puede cambiarlos con `theme`: una lista hardcodeada quedaría
 * desactualizada en cuanto se agregue el próximo.
 */
function isDarkBackground(el: HTMLElement): boolean {
	// El contenedor suele ser transparente; en ese caso manda el fondo del body.
	for (const node of [el, document.body]) {
		const rgb = getComputedStyle(node).backgroundColor.match(/\d+(\.\d+)?/g);
		if (!rgb || rgb.length < 3) continue;

		const [r, g, b] = rgb.map(Number);
		const alpha = rgb.length > 3 ? Number(rgb[3]) : 1;
		if (alpha === 0) continue;

		// Luminancia relativa aproximada (ITU-R BT.601)
		return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
	}
	return true; // el sitio es oscuro por defecto
}

/** Escapa para que el código del diagrama viaje intacto dentro del HTML. */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Marca que `marked` debe emitir para un bloque mermaid. */
export function mermaidBlock(code: string): string {
	return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
}

/** ¿El HTML renderizado tiene algún diagrama pendiente? */
export function hasMermaid(html: string): boolean {
	return html.includes('class="mermaid"');
}

/**
 * Dibuja los diagramas que haya dentro de `container`.
 * Es seguro llamarla siempre: si no hay ninguno, no importa la librería.
 */
export async function renderMermaid(container: HTMLElement | null | undefined): Promise<void> {
	if (!container) return;

	const nodes = Array.from(container.querySelectorAll<HTMLElement>('pre.mermaid'));
	const pending = nodes.filter((n) => n.dataset.processed !== 'true');
	if (pending.length === 0) return;

	try {
		const mermaid = (await import('mermaid')).default;

		if (!initialized) {
			mermaid.initialize({
				startOnLoad: false,
				// El contenido entra por {@html}, así que no se permite HTML crudo
				// dentro de las etiquetas del diagrama.
				securityLevel: 'strict',
				theme: isDarkBackground(container) ? 'dark' : 'default',
				fontFamily: 'inherit'
			});
			initialized = true;
		}

		await mermaid.run({ nodes: pending });
	} catch (error) {
		// Un diagrama con sintaxis inválida no puede romper la lectura del documento
		console.error('[mermaid] no se pudo dibujar el diagrama:', error);
		for (const node of pending) {
			node.dataset.processed = 'true';
			node.classList.add('mermaid-error');
		}
	}
}
