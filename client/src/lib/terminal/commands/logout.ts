import type { Command } from '../types';
import { t } from '$lib/i18n/helpers';

/**
 * Comando logout - cerrar sesión
 */
export const logout: Command = {
	name: 'logout',
	description: t('terminal.logout.description'),
	usage: 'logout',

	execute() {
		doLogout();
		return {
			output: `<span class="ai-info">⏳ ${t('terminal.logout.logging_out')}</span>`,
			isHtml: true
		};
	}
};

async function doLogout() {
	try {
		// Usar el endpoint de SvelteKit que elimina las cookies de sesión
		await fetch('/auth/logout', {
			method: 'POST',
			credentials: 'include'
		});

		// Notificar cambio de auth
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('auth:change'));
		}

		showResult(`<span class="ai-success">✅ ${t('terminal.logout.success')}</span>

<span class="system-hint">👋 ${t('terminal.logout.goodbye')}</span>
<span class="system-hint">💡 ${t('terminal.logout.to_login')} <code>login</code></span>`);

	} catch (error) {
		// Logout siempre "funciona" aunque falle la API
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('auth:change'));
		}

		showResult(`<span class="ai-success">✅ ${t('terminal.logout.success')}</span>

<span class="system-hint">👋 ${t('terminal.logout.goodbye')}</span>`);
	}
}

function showResult(html: string) {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('terminal:output', {
				detail: { output: html, isHtml: true }
			})
		);
	}
}

export default logout;
