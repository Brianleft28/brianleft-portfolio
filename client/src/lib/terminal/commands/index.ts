import type { Command } from '../types';
import admin from './admin';
import { apikey } from './apikey';
import { cat } from './cat';
import { cd } from './cd';
import { cls } from './cls';
import { cv } from './cv';
import email from './email';
import { help } from './help';
import { login } from './login';
import { logout } from './logout';
import { ls } from './ls';
import { pwd } from './pwd';
import { register } from './register';
import { tree } from './tree';
import { torvalds } from './torvalds';
import { theme } from './theme';
import { verify } from './verify';
import { whoami } from './whoami';

const allCommands: Command[] = [admin, apikey, cat, cd, cls, cv, email, help, login, logout, ls, pwd, register, tree, torvalds, theme, verify, whoami];
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

// Aliases para el comando AI - múltiples para compatibilidad
// El alias dinámico se registra desde el componente Terminal
commandRegistry.set('ai', torvalds);
commandRegistry.set('torvalds', torvalds);
commandRegistry.set('assistant', torvalds);

// Aliases para register
commandRegistry.set('signup', register);
commandRegistry.set('createuser', register);

// Aliases para verify
commandRegistry.set('confirmar', verify);
commandRegistry.set('verificar', verify);

// Aliases para auth
commandRegistry.set('signin', login);
commandRegistry.set('signout', logout);
commandRegistry.set('salir', logout);

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

// Aliases para apikey
commandRegistry.set('key', apikey);
commandRegistry.set('gemini', apikey);

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
export { apikey, cat, cd, cls, cv, help, ls, pwd, register, tree, torvalds };
