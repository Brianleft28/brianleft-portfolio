import type { Command } from '../types';
import { t } from '$lib/i18n/helpers';

/**
 * Comando whoami - muestra información del usuario actual
 */
export const whoami: Command = {
	name: 'whoami',
	get description() {
		return t('terminal.whoami.description');
	},
	usage: 'whoami',

	async execute() {
		try {
			const response = await fetch('/api/users/me', { credentials: 'include' });

			if (!response.ok) {
				return {
					output: `<span class="system-hint">👤 ${t('terminal.whoami.guest')}</span>
<span class="system-hint">${t('terminal.whoami.no_session')}</span>`,
					isHtml: true
				};
			}

			const user = await response.json();

			return {
				output: `<span class="ai-success">👤 ${t('terminal.whoami.authenticated')}</span>

<span class="category-header">${t('terminal.whoami.info')}</span>
  <span class="ai-info">${t('terminal.whoami.username')}:</span>    <strong>${user.username}</strong>
  <span class="ai-info">${t('terminal.whoami.email')}:</span>       ${user.email}
  <span class="ai-info">${t('terminal.whoami.role')}:</span>         ${user.role}
  <span class="ai-info">${t('terminal.whoami.display')}:</span>     ${user.displayName || user.username}`,
				isHtml: true
			};
		} catch (error) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.whoami.error')}</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error'}</span>`,
				isHtml: true
			};
		}
	}
};

export default whoami;
