import type { Command } from '../types';
import { t } from '$lib/i18n/helpers';

export const cls: Command = {
	name: 'cls',
	get description() {
		return t('terminal.cls.description');
	},
	usage: 'cls [-h]',
	execute(args) {
		// Help flag
		if (args?.includes('-h') || args?.includes('--help')) {
			return {
				output: `<span class="command-highlight">cls</span> - Limpia la consola

<span class="system-header">USO:</span>
  cls

<span class="system-header">ALIASES:</span>
  clear         Mismo efecto que cls
  Ctrl+L        Atajo de teclado

<span class="system-hint">La terminal se limpia automáticamente al abrir/cerrar</span>`,
				isHtml: true
			};
		}

		return { output: '', clear: true };
	}
};
