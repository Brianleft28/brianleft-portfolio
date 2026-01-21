import type { Command } from '../types';
import admin from './admin';
import { cat } from './cat';
import { cd } from './cd';
import { cls } from './cls';
import { cv } from './cv';
import { help } from './help';
import { ls } from './ls';
import { pwd } from './pwd';
import { tree } from './tree';
import { torvalds } from './torvalds';

const allCommands: Command[] = [admin, cat, cd, cls, cv, help, ls, pwd, tree, torvalds];
const commandRegistry: Map<string, Command> = new Map();

// Registrar todos los comandos
allCommands.forEach((cmd) => {
	commandRegistry.set(cmd.name, cmd);
});

// Aliases
commandRegistry.set('clear', cls);
commandRegistry.set('dir', ls);
commandRegistry.set('-h', help);
commandRegistry.set('--help', help);

// Aliases para admin
commandRegistry.set('settings', admin);
commandRegistry.set('panel', admin);
commandRegistry.set('config', admin);

// ll es ls -l (se maneja como alias especial)
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

export function getCommand(name: string): Command | undefined {
	return commandRegistry.get(name.toLowerCase());
}

export function getAllCommands(): Command[] {
	return allCommands;
}

export function generateHelp(): string {
	const lines = [
		'<span class="system-header">Comandos disponibles:</span>',
		''
	];

	for (const cmd of allCommands) {
		lines.push(`  <span class="command-highlight">${cmd.name.padEnd(12)}</span> ${cmd.description}`);
	}

	lines.push('');
	lines.push('<span class="system-hint">Tip: Usa Ctrl+L para limpiar</span>');
	lines.push('<span class="system-hint">Tip: torvalds para opciones de AI</span>');

	return lines.join('\n');
}

// Re-exportar comandos individuales
export { cat, cd, cls, cv, help, ls, pwd, tree, torvalds };
