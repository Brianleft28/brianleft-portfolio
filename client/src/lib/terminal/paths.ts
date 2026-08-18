import type { FileSystemNode, FolderNode } from '$lib/data/file-system';

/**
 * Rutas del sistema simulado.
 *
 * El portfolio simula un Linux, así que la raíz del árbol es el home del dueño
 * y las rutas usan `/`. Internamente siempre se guarda la ruta absoluta; `~` es
 * sólo una abreviatura de presentación (ver `displayPath`).
 */
export const HOME = '/home/brian';

/** Divide una ruta en segmentos, descartando vacíos y `.` */
function segments(path: string): string[] {
	return path.split('/').filter((p) => p !== '' && p !== '.');
}

/**
 * Normaliza una ruta absoluta resolviendo `..` y `.`.
 * Nunca sube más allá de `/`: `cd ..` en la raíz se queda en la raíz.
 */
function normalize(absolute: string): string {
	const out: string[] = [];
	for (const part of segments(absolute)) {
		if (part === '..') out.pop();
		else out.push(part);
	}
	return '/' + out.join('/');
}

/**
 * Convierte un destino escrito por el visitante en una ruta absoluta,
 * sin mirar todavía si existe.
 *
 * Acepta absolutas (`/home/brian/proyectos`), relativas (`proyectos/vus`),
 * `~`, `~/algo`, `.` y `..`, con cualquier cantidad de segmentos.
 */
export function toAbsolute(currentPath: string, target: string): string {
	const t = target.trim();

	if (t === '' || t === '~') return HOME;
	if (t.startsWith('~/')) return normalize(`${HOME}/${t.slice(2)}`);
	if (t.startsWith('/')) return normalize(t);

	return normalize(`${currentPath}/${t}`);
}

/**
 * Busca el nodo que vive en una ruta absoluta.
 *
 * La raíz del árbol *es* el home: `/home/brian` corresponde al nodo raíz, y sus
 * hijos cuelgan de ahí. Una ruta fuera del home no existe en este sistema.
 */
export function getNodeAt(tree: FolderNode, absolutePath: string): FileSystemNode | undefined {
	const homeParts = segments(HOME);
	const parts = segments(normalize(absolutePath));

	// Tiene que empezar dentro del home
	for (let i = 0; i < homeParts.length; i++) {
		if (parts[i]?.toLowerCase() !== homeParts[i].toLowerCase()) return undefined;
	}

	let current: FileSystemNode = tree;
	for (const part of parts.slice(homeParts.length)) {
		if (current.type !== 'folder') return undefined;
		// La anotación es necesaria: `children` es `FileSystemNode[]` y sin ella
		// TypeScript no puede resolver el tipo recursivo del `find`.
		const found: FileSystemNode | undefined = (current as FolderNode).children.find(
			(child) => child.name.toLowerCase() === part.toLowerCase()
		);
		if (!found) return undefined;
		current = found;
	}
	return current;
}

/** Resuelve un destino relativo o absoluto y devuelve la ruta y el nodo. */
export function resolvePath(
	tree: FolderNode,
	currentPath: string,
	target: string
): { path: string; node: FileSystemNode | undefined } {
	const path = toAbsolute(currentPath, target);
	return { path, node: getNodeAt(tree, path) };
}

/** Cómo se muestra una ruta: el home se colapsa a `~`. */
export function displayPath(absolutePath: string): string {
	const normalized = normalize(absolutePath);
	if (normalized === HOME) return '~';
	if (normalized.startsWith(HOME + '/')) return '~' + normalized.slice(HOME.length);
	return normalized;
}

/** Nombre del último segmento, para mensajes de error. */
export function baseName(absolutePath: string): string {
	const parts = segments(absolutePath);
	return parts[parts.length - 1] ?? '/';
}
