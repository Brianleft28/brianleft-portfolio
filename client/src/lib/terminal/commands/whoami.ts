import type { Command } from '../types';

/**
 * Comando whoami - muestra información del usuario actual
 */
export const whoami: Command = {
	name: 'whoami',
	description: 'Ver información del usuario actual',
	usage: 'whoami',

	async execute() {
		try {
			const response = await fetch('/api/users/me', { credentials: 'include' });
			
			if (!response.ok) {
				return {
					output: `<span class="system-hint">👤 Usuario: <strong>invitado</strong></span>
<span class="system-hint">No hay sesión activa.</span>

<span class="system-hint">💡 Para registrarte: <code>register -h</code></span>
<span class="system-hint">💡 Para iniciar sesión: <code>login -h</code></span>`,
					isHtml: true
				};
			}

			const user = await response.json();
			
			return {
				output: `<span class="ai-success">👤 Usuario autenticado</span>

<span class="category-header">Información:</span>
  <span class="ai-info">Username:</span>    <strong>${user.username}</strong>
  <span class="ai-info">Email:</span>       ${user.email}
  <span class="ai-info">Rol:</span>         ${user.role}
  <span class="ai-info">Display:</span>     ${user.displayName || user.username}
  <span class="ai-info">Subdomain:</span>   ${user.subdomain}
  <span class="ai-info">Verificado:</span>  ${user.emailVerified ? '✅ Sí' : '❌ No'}

<span class="system-hint">💡 Panel de admin: <code>admin</code></span>
<span class="system-hint">💡 Cerrar sesión: <code>logout</code></span>`,
				isHtml: true
			};
		} catch (error) {
			return {
				output: `<span class="error-text">❌ Error al obtener información del usuario</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error de conexión'}</span>`,
				isHtml: true
			};
		}
	}
};

export default whoami;
