import type { Command, CommandContext, CommandResult } from '../types';
import { t } from '$lib/i18n/helpers';

/**
 * Comando oculto del dueño del portfolio.
 *
 * No está registrado en `allCommands`, así que no aparece en `help`, en
 * `help admin` ni en ninguna enumeración de comandos: sólo lo encuentra
 * `getCommand('admin')`, o sea, quien ya sabe que existe.
 *
 * Las credenciales se piden por prompt interactivo (`ctx.ask`) en vez de por
 * flags: escribirlas como `admin -u X -p Y` dejaría la contraseña en el
 * historial que la terminal persiste en `localStorage['terminal-history']`.
 */
const adminCommand: Command = {
	name: 'admin',
	get description() {
		return t('terminal.admin.description');
	},
	usage: 'admin [logout]',

	async execute(args: string[], context: CommandContext): Promise<CommandResult> {
		const action = args[0]?.toLowerCase() || '';

		if (action === 'logout') {
			return logout();
		}

		// Ya autenticado: abrir el panel directamente
		if (context.isAuthenticated) {
			return openPanel();
		}

		if (!context.ask) {
			return {
				output: `<span class="error-text">La terminal no soporta prompts interactivos.</span>
<span class="system-hint">Entrá por <a href="/admin/login" target="_blank">/admin/login</a>.</span>`,
				isHtml: true
			};
		}

		const username = await context.ask('usuario: ');
		if (username === null) return cancelled();

		const password = await context.ask('password: ', { masked: true });
		if (password === null) return cancelled();

		if (!username.trim() || !password) {
			return { output: '<span class="error-text">❌ Credenciales inválidas</span>', isHtml: true };
		}

		try {
			const response = await fetch('/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username: username.trim(), password })
			});

			if (!response.ok) {
				// Mismo mensaje para usuario inexistente y contraseña incorrecta:
				// no le confirmamos a nadie qué mitad acertó.
				return {
					output: '<span class="error-text">❌ Credenciales inválidas</span>',
					isHtml: true
				};
			}

			return {
				output: `<span class="ai-success">🔓 Sesión iniciada como <strong>${escapeHtml(username.trim())}</strong></span>

<span class="system-hint">Panel: <a href="/admin/settings" target="_blank">/admin/settings</a></span>
<span class="system-hint">Cerrar sesión: <code>admin logout</code></span>`,
				isHtml: true
			};
		} catch (error) {
			return {
				output: `<span class="error-text">❌ Error de conexión con el servidor</span>
<span class="ai-warning">${escapeHtml(error instanceof Error ? error.message : 'Error')}</span>`,
				isHtml: true
			};
		}
	}
};

function openPanel(): CommandResult {
	if (typeof window !== 'undefined') {
		window.open('/admin/settings', '_blank');
	}
	return {
		output: `⚙️ Abriendo <a href="/admin/settings" target="_blank"><strong>panel</strong></a> en una nueva pestaña.

<span class="system-hint">Cerrar sesión: <code>admin logout</code></span>`,
		isHtml: true
	};
}

async function logout(): Promise<CommandResult> {
	try {
		await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
		return { output: '<span class="ai-success">👋 Sesión cerrada</span>', isHtml: true };
	} catch {
		return { output: '<span class="error-text">❌ No se pudo cerrar la sesión</span>', isHtml: true };
	}
}

function cancelled(): CommandResult {
	return { output: '<span class="system-hint">Cancelado</span>', isHtml: true };
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export default adminCommand;
