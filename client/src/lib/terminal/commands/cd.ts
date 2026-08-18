import type { Command } from '../types';
import { displayPath } from '../paths';

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

<span class="system-header">NAVEGACIÓN:</span>
  cd ..                     Subir un nivel
  cd ~                      Ir al home
  cd /home/brian/proyectos  Ruta absoluta
  cd proyectos/vus          Varios niveles de una

<span class="system-hint">Sin argumentos muestra el directorio actual</span>`,
				isHtml: true
			};
		}

		const target = args[0];

		if (!target) {
			return {
				output: `<span class="folder-name">📁 ${displayPath(ctx.currentPath)}</span>`,
				isHtml: true
			};
		}

		const { path, node } = ctx.resolve(target);

		if (!node) {
			return {
				output: `<span class="error-text">cd: ${target}: No existe el directorio</span>`,
				isHtml: true
			};
		}

		if (node.type !== 'folder') {
			return {
				output: `<span class="error-text">cd: ${target}: No es un directorio</span>`,
				isHtml: true
			};
		}

		ctx.setPath(path);
		return { output: '' };
	}
};
