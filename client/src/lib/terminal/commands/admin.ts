import type { Command, CommandContext, CommandResult } from '../types';
import { t } from '$lib/i18n/helpers';

const adminCommand: Command = {
	name: 'admin',
	description: t('terminal.admin.description'),
	usage: 'admin [sección]',

	execute(args: string[], context: CommandContext): CommandResult {
		const section = args[0]?.toLowerCase() || '';

		// Mapeo de secciones
		const sections: Record<string, { url: string; label: string; icon: string }> = {
			'': { url: '/admin/settings', label: t('terminal.admin.panel'), icon: '⚙️' },
			'login': { url: '/admin/login', label: t('terminal.admin.login'), icon: '🔐' },
			'settings': { url: '/admin/settings', label: t('terminal.admin.config'), icon: '⚙️' },
			'config': { url: '/admin/settings', label: t('terminal.admin.config'), icon: '⚙️' },
		};

		const target = sections[section];

		if (!target) {
			return {
				output: `❌ ${t('terminal.admin.unknown_section')} "${section}"

${t('terminal.admin.available_sections')}
  • <a href="/admin/login" target="_blank">login</a> — ${t('terminal.admin.login')}
  • <a href="/admin/settings" target="_blank">settings</a> — ${t('terminal.admin.settings')}

${t('common.examples')}: <code>admin settings</code>`,
				isHtml: true
			};
		}

		// Abrir en nueva pestaña
		if (typeof window !== 'undefined') {
			window.open(target.url, '_blank');
		}

		return {
			output: `${target.icon} ${t('terminal.admin.opening')} <a href="${target.url}" target="_blank"><strong>${target.label}</strong></a> ${t('terminal.admin.new_tab')}

<span style="color: #888">💡 ${t('common.tip')}: <code>admin -h</code> ${t('terminal.admin.tip_sections')}</span>`,
			isHtml: true
		};
	},
};

export default adminCommand;
