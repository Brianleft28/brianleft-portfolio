import type { Command } from '../types';

export const pwd: Command = {
	name: 'pwd',
	description: 'Muestra el directorio actual',
	usage: 'pwd [-h]',
	execute(args, ctx) {
		// Help flag
		if (args?.includes('-h') || args?.includes('--help')) {
			return {
				output: `<span class="command-highlight">pwd</span> - Print Working Directory

<span class="system-header">USO:</span>
  pwd

<span class="system-header">DESCRIPCIÓN:</span>
  Muestra la ruta completa del directorio actual.

<span class="system-hint">También puedes usar 'cd' sin argumentos</span>`,
				isHtml: true
			};
		}

		return { 
			output: `<span class="folder-name">📁 ${ctx.currentPath}</span>`,
			isHtml: true
		};
	}
};
