import type { Command } from '../types';
import type { FolderNode, FileNode } from '$lib/data/file-system';

export const ls: Command = {
	name: 'ls',
	description: 'Lista archivos y carpetas',
	usage: 'ls [-h] [-l]',
	execute(args, ctx) {
		// Help flag
		if (args?.includes('-h') || args?.includes('--help')) {
			return {
				output: `<span class="command-highlight">ls</span> - Lista archivos y carpetas

<span class="system-header">USO:</span>
  ls              Lista compacta
  ls -l           Lista detallada

<span class="system-header">OPCIONES:</span>
  -h, --help      Muestra esta ayuda
  -l              Formato largo con detalles

<span class="system-header">ALIASES:</span>
  dir             Igual que ls
  ll              Igual que ls -l`,
				isHtml: true
			};
		}

		const node = ctx.getNodeAtPath(ctx.currentPath);

		if (!node || node.type !== 'folder') {
			return { output: `<span class="error-text">ls: no se puede acceder a '${ctx.currentPath}': No es un directorio</span>`, isHtml: true };
		}

		const folder = node as FolderNode;

		if (folder.children.length === 0) {
			return { output: '<span class="system-hint">(directorio vacío)</span>', isHtml: true };
		}

		const longFormat = args?.includes('-l');

		if (longFormat) {
			// Formato largo
			const lines: string[] = [
				`<span class="system-hint">total ${folder.children.length}</span>`
			];

			for (const child of folder.children) {
				if (child.type === 'folder') {
					const subFolder = child as FolderNode;
					const count = subFolder.children?.length || 0;
					lines.push(`📁 <span class="folder-name">${child.name.padEnd(20)}</span> <span class="system-hint">${count} items</span>`);
				} else {
					const file = child as FileNode;
					const size = file.content ? `${file.content.length} chars` : 'empty';
					const icon = child.name.endsWith('.md') ? '📄' : '📋';
					lines.push(`${icon} <span class="file-name">${child.name.padEnd(20)}</span> <span class="system-hint">${size}</span>`);
				}
			}

			return { output: lines.join('\n'), isHtml: true };
		}

		// Formato compacto
		const items = folder.children.map((child) => {
			if (child.type === 'folder') {
				return `📁 <span class="folder-name">${child.name}/</span>`;
			}
			const icon = child.name.endsWith('.md') ? '📄' : '📋';
			return `${icon} <span class="file-name">${child.name}</span>`;
		});

		return { output: items.join('  '), isHtml: true };
	}
};
