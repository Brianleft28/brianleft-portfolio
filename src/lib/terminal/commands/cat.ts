import type { Command } from '../types';
import type { FolderNode, FileNode } from '$lib/data/file-system';

export const cat: Command = {
	name: 'cat',
	description: 'Muestra contenido de archivo (renderiza .md)',
	usage: 'cat [-h] <archivo>',
	execute(args, ctx) {
		// Help flag
		if (args.includes('-h') || args.includes('--help')) {
			return {
				output: `<span class="command-highlight">cat</span> - Muestra contenido de archivo

<span class="system-header">USO:</span>
  cat &lt;archivo&gt;

<span class="system-header">OPCIONES:</span>
  -h, --help    Muestra esta ayuda

<span class="system-header">EJEMPLOS:</span>
  cat readme.md     Lee archivo markdown
  cat meta.md       Muestra info del portfolio

<span class="system-hint">Los archivos .md se renderizan con formato</span>`,
				isHtml: true
			};
		}

		const fileName = args[0];

		if (!fileName) {
			return { output: '<span class="error-text">cat: falta operando archivo</span>\nUso: cat &lt;archivo&gt;', isHtml: true };
		}

		const currentNode = ctx.getNodeAtPath(ctx.currentPath);

		if (!currentNode || currentNode.type !== 'folder') {
			return { output: '<span class="error-text">cat: directorio no encontrado</span>', isHtml: true };
		}

		const folder = currentNode as FolderNode;
		const file = folder.children.find(
			(child) => child.type !== 'folder' && child.name.toLowerCase() === fileName.toLowerCase()
		) as FileNode | undefined;

		if (!file) {
			return { output: `<span class="error-text">cat: ${fileName}: No existe el archivo</span>`, isHtml: true };
		}

		if (!file.content) {
			return { output: `<span class="error-text">cat: ${fileName}: Archivo vacío</span>`, isHtml: true };
		}

		const isMarkdown = fileName.endsWith('.md');

		return {
			output: file.content,
			isMarkdown
		};
	}
};
