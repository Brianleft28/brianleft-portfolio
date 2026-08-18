import type { Command } from '../types';
import type { FileNode } from '$lib/data/file-system';

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
  cat LEEME.md                            Archivo de la carpeta actual
  cat proyectos/vus/README.md             Ruta relativa
  cat /home/brian/proyectos/vus/README.md Ruta absoluta

<span class="system-hint">Los archivos .md se renderizan con formato</span>`,
				isHtml: true
			};
		}

		const fileName = args[0];

		if (!fileName) {
			return { output: '<span class="error-text">cat: falta operando archivo</span>\nUso: cat &lt;archivo&gt;', isHtml: true };
		}

		const { node } = ctx.resolve(fileName);

		if (!node) {
			return { output: `<span class="error-text">cat: ${fileName}: No existe el archivo</span>`, isHtml: true };
		}

		if (node.type === 'folder') {
			return { output: `<span class="error-text">cat: ${fileName}: Es un directorio</span>`, isHtml: true };
		}

		const file = node as FileNode;

		if (!file.content) {
			return { output: `<span class="error-text">cat: ${fileName}: Archivo vacío</span>`, isHtml: true };
		}

		const isMarkdown = file.name.toLowerCase().endsWith('.md');

		return {
			output: file.content,
			isMarkdown
		};
	}
};
