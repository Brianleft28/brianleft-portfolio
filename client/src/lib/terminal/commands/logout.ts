import type { Command } from '../types';

/**
 * Comando logout - cerrar sesión
 */
export const logout: Command = {
	name: 'logout',
	description: 'Cerrar sesión',
	usage: 'logout',

	execute() {
		doLogout();
		return {
			output: `<span class="ai-info">⏳ Cerrando sesión...</span>`,
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

		showResult(`<span class="ai-success">✅ Sesión cerrada correctamente</span>

<span class="system-hint">👋 ¡Hasta pronto!</span>
<span class="system-hint">💡 Para iniciar sesión: <code>login</code></span>`);

	} catch (error) {
		// Logout siempre "funciona" aunque falle la API
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('auth:change'));
		}
		
		showResult(`<span class="ai-success">✅ Sesión cerrada</span>

<span class="system-hint">👋 ¡Hasta pronto!</span>`);
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
