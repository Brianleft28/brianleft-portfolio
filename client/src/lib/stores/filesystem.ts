import { derived } from 'svelte/store';
import {
	dynamicFilesystem,
	type FileSystemNode as DynamicFSNode
} from '$lib/stores/config';
import {
	fileSystemData as staticFileSystem,
	type FileSystemNode,
	type FolderNode,
	type FileNode
} from '$lib/data/file-system';
import { HOME } from '$lib/terminal/paths';

/**
 * Árbol de archivos único para el explorador y la terminal.
 *
 * Antes había dos fuentes: `routes/+page.svelte` derivaba el árbol real de la
 * API para el explorador, mientras que `Terminal.svelte` importaba el árbol
 * estático de fallback. Como la terminal se monta en `+layout.svelte` —hermano
 * de la página, no su padre— no había forma de pasarle el bueno por props, y
 * quedaba navegando un `proyectos` con `children: []`.
 *
 * Al derivar los dos del mismo store, no pueden volver a divergir.
 */
function transformNode(node: DynamicFSNode): FileSystemNode {
	if (node.type === 'folder') {
		return {
			id: String(node.id),
			name: node.name,
			type: 'folder',
			children: (node.children || []).map(transformNode)
		} as FolderNode;
	}
	return {
		id: String(node.id),
		name: node.name,
		type: 'markdown',
		content: node.content || ''
	} as FileNode;
}

export const fileTree = derived<typeof dynamicFilesystem, FolderNode>(
	dynamicFilesystem,
	($dynamicFs) => {
		// La API devuelve [{id, name, children}] y ese primer elemento ES la raíz
		if ($dynamicFs && $dynamicFs.length > 0) {
			const root = $dynamicFs[0];
			return {
				id: 'root',
				name: HOME,
				type: 'folder',
				children: (root.children || []).map(transformNode)
			} as FolderNode;
		}
		return staticFileSystem;
	}
);
