import type { Command } from '../types';
import type { FolderNode, FileSystemNode } from '$lib/data/file-system';
import { displayPath } from '../paths';

interface TreeStats {
	folders: number;
	files: number;
}

function buildTree(
	node: FileSystemNode,
	prefix: string = '',
	isLast: boolean = true,
	stats: TreeStats
): string {
	const connector = isLast ? '└── ' : '├── ';
	const extension = isLast ? '    ' : '│   ';

	let result = '';

	if (node.type === 'folder') {
		const folder = node as FolderNode;
		stats.folders++;
		result += `${prefix}${connector}📁 <span class="folder-name">${folder.name}/</span>\n`;

		folder.children.forEach((child, index) => {
			const isChildLast = index === folder.children.length - 1;
			result += buildTree(child, prefix + extension, isChildLast, stats);
		});
	} else {
		stats.files++;
		const icon = node.name.endsWith('.md') ? '📄' : '📋';
		result += `${prefix}${connector}${icon} <span class="file-name">${node.name}</span>\n`;
	}

	return result;
}

export const tree: Command = {
	name: 'tree',
	description: 'Muestra estructura de árbol',
	usage: 'tree [-h]',
	execute(args, ctx) {
		// Help flag
		if (args?.includes('-h') || args?.includes('--help')) {
			return {
				output: `<span class="command-highlight">tree</span> - Muestra estructura de árbol

<span class="system-header">USO:</span>
  tree

<span class="system-header">DESCRIPCIÓN:</span>
  Muestra la estructura jerárquica del directorio
  actual en formato de árbol visual.

<span class="system-header">ICONOS:</span>
  📁  Carpeta
  📄  Archivo Markdown
  📋  Otro archivo`,
				isHtml: true
			};
		}

		const target = args?.find((a) => !a.startsWith('-'));
		const currentNode = target ? ctx.resolve(target).node : ctx.getNodeAtPath(ctx.currentPath);
		const label = target ? displayPath(ctx.resolve(target).path) : displayPath(ctx.currentPath);

		if (!currentNode || currentNode.type !== 'folder') {
			return {
				output: `<span class="error-text">tree: ${target || displayPath(ctx.currentPath)}: No es un directorio</span>`,
				isHtml: true
			};
		}

		const folder = currentNode as FolderNode;
		const stats: TreeStats = { folders: 0, files: 0 };

		let output = `📁 <span class="folder-name">${label}</span>\n`;

		folder.children.forEach((child, index) => {
			const isLast = index === folder.children.length - 1;
			output += buildTree(child, '', isLast, stats);
		});

		output += `\n<span class="system-hint">${stats.folders} carpetas, ${stats.files} archivos</span>`;

		return { output, isHtml: true };
	}
};
