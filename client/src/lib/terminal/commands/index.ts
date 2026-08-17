import type { Command } from '../types';
import admin from './admin';
import { cat } from './cat';
import { cd } from './cd';
import { cls } from './cls';
import { cv } from './cv';
import { help } from './help';
import { lang } from './lang';
import { ls } from './ls';
import { pwd } from './pwd';
import { tree } from './tree';
import { torvalds } from './torvalds';
import { theme } from './theme';
import { whoami } from './whoami';

/**
 * Comandos públicos: son los que enumera `getAllCommands()` y, por lo tanto,
 * los únicos que aparecen en `help` y en `help <comando>`.
 */
const allCommands: Command[] = [cat, cd, cls, cv, help, lang, ls, pwd, tree, torvalds, theme, whoami];
const commandRegistry: Map<string, Command> = new Map();

// Registrar todos los comandos
allCommands.forEach((cmd) => {
	commandRegistry.set(cmd.name, cmd);
});

// `admin` es del dueño: se registra para poder ejecutarlo, pero queda fuera de
// `allCommands` para que no lo liste ninguna ayuda ni enumeración de comandos.
commandRegistry.set(admin.name, admin);

// Aliases
commandRegistry.set('clear', cls);
commandRegistry.set('dir', ls);
commandRegistry.set('-h', help);
commandRegistry.set('--help', help);

// Aliases para el comando AI - múltiples para compatibilidad
// El alias dinámico se registra desde el componente Terminal
commandRegistry.set('ai', torvalds);
commandRegistry.set('torvalds', torvalds);
commandRegistry.set('assistant', torvalds);


// ll es ls -l (alias especial)
const llCommand: Command = {
	name: 'll',
	description: 'Lista detallada (alias de ls -l)',
	usage: 'll',
	execute(args, ctx) {
		return ls.execute(['-l', ...(args || [])], ctx);
	}
};
commandRegistry.set('ll', llCommand);

// Aliases para cv
commandRegistry.set('curriculum', cv);
commandRegistry.set('resume', cv);

// Aliases para lang
commandRegistry.set('language', lang);
commandRegistry.set('idioma', lang);
commandRegistry.set('locale', lang);

/**
 * Registra un alias dinámico para el comando AI
 * Se usa para que el nombre del comando coincida con la config
 */
export function registerAiCommandAlias(alias: string): void {
	if (alias && !commandRegistry.has(alias.toLowerCase())) {
		commandRegistry.set(alias.toLowerCase(), torvalds);
	}
}

export function getCommand(name: string): Command | undefined {
	return commandRegistry.get(name.toLowerCase());
}

export function isCommandProtected(name: string): boolean {
	const cmd = commandRegistry.get(name.toLowerCase());
	return cmd?.requiresAuth === true;
}

export function getAllCommands(): Command[] {
	return allCommands;
}

export function generateHelp(): string {
	const lines = ['<span class="system-header">Comandos disponibles:</span>', ''];

	for (const cmd of allCommands) {
		lines.push(
			`  <span class="command-highlight">${cmd.name.padEnd(12)}</span> ${cmd.description}`
		);
	}

	lines.push('');
	lines.push('<span class="system-hint">Tip: Usa Ctrl+L para limpiar</span>');

	return lines.join('\n');
}

// Re-exportar comandos individuales
export { cat, cd, cls, cv, help, lang, ls, pwd, tree, torvalds };
