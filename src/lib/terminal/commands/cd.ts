import type { Command } from '../types';
import type { FolderNode } from '$lib/data/file-system';

export const cd: Command = {
	name: 'cd',
	description: 'Cambia de directorio',
	usage: 'cd [-h] <directorio>',
	execute(args, ctx) {
		// Help flag
		if (args.includes('-h') || args.includes('--help')) {
			return {
				output: `<span class="command-highlight">cd</span> - Cambia de directorio

<span class="system-header">USO:</span>
  cd &lt;directorio&gt;

<span class="system-header">OPCIONES:</span>
  -h, --help    Muestra esta ayuda

<span class="system-header">NAVEGACIÓN:</span>
  cd ..         Subir un nivel
  cd /          Ir a raíz (C:\\)
  cd ~          Ir a raíz (alias)
  cd memory     Entrar a carpeta memory

<span class="system-hint">Sin argumentos muestra el directorio actual</span>`,
				isHtml: true
			};
		}

		const target = args[0];

		if (!target) {
			return { output: `<span class="folder-name">📁 ${ctx.currentPath}</span>`, isHtml: true };
		}

		if (target === '/' || target === 'C:\\' || target === '~') {
			ctx.setPath('C:\\');
			return { output: '' };
		}

		if (target === '..') {
			const parts = ctx.currentPath.split('\\').filter((p) => p && p !== 'C:');
			if (parts.length > 0) {
				parts.pop();
				ctx.setPath(parts.length > 0 ? 'C:\\' + parts.join('\\') : 'C:\\');
			}
			return { output: '' };
		}

		const currentNode = ctx.getNodeAtPath(ctx.currentPath);
		if (!currentNode || currentNode.type !== 'folder') {
			return { output: `<span class="error-text">cd: ${ctx.currentPath}: No es un directorio</span>`, isHtml: true };
		}

		const folder = currentNode as FolderNode;
		const targetFolder = folder.children.find(
			(child) => child.type === 'folder' && child.name.toLowerCase() === target.toLowerCase()
		);

		if (!targetFolder) {
			return { output: `<span class="error-text">cd: ${target}: No existe el directorio</span>`, isHtml: true };
		}

		const newPath =
			ctx.currentPath === 'C:\\'
				? `C:\\${targetFolder.name}`
				: `${ctx.currentPath}\\${targetFolder.name}`;

		ctx.setPath(newPath);
		return { output: '' };
	}
};
