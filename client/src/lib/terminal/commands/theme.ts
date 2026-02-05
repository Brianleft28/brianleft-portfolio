import type { Command, CommandContext, CommandResult } from '../types';
import { t } from '$lib/i18n/helpers';

interface ThemeDefinition {
	name: string;
	descriptionKey: string;
	preview: string;
}

const AVAILABLE_THEMES: ThemeDefinition[] = [
	{ name: 'matrix', descriptionKey: 'terminal.theme.themes.hacker', preview: '🟢' },
	{ name: 'dracula', descriptionKey: 'terminal.theme.themes.dracula', preview: '🧛' },
	{ name: 'monokai', descriptionKey: 'terminal.theme.themes.cyberpunk', preview: '🎨' },
	{ name: 'nord', descriptionKey: 'terminal.theme.themes.nord', preview: '❄️' },
	{ name: 'cyberpunk', descriptionKey: 'terminal.theme.themes.synthwave', preview: '🌆' },
	{ name: 'solarized', descriptionKey: 'terminal.theme.themes.monokai', preview: '☀️' },
	{ name: 'gruvbox', descriptionKey: 'terminal.theme.themes.gruvbox', preview: '🟤' }
];

const THEME_STORAGE_KEY = 'portfolio-theme';

function getCurrentTheme(): string {
	if (typeof window === 'undefined') return 'matrix';
	return localStorage.getItem(THEME_STORAGE_KEY) || 'matrix';
}

function applyTheme(themeName: string): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(THEME_STORAGE_KEY, themeName);
		document.documentElement.setAttribute('data-theme', themeName);
	}
}

async function saveThemeToServer(themeName: string): Promise<boolean> {
	try {
		const response = await fetch('/api/settings/theme', {
			method: 'PUT',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ value: themeName })
		});
		return response.ok;
	} catch {
		return false;
	}
}

function setTheme(themeName: string, isAuthenticated: boolean = false): { success: boolean; savedToServer: boolean } {
	const validTheme = AVAILABLE_THEMES.find((t) => t.name === themeName);
	if (!validTheme) return { success: false, savedToServer: false };

	applyTheme(themeName);
	
	// Si está autenticado, también guardar en servidor
	if (isAuthenticated) {
		saveThemeToServer(themeName); // Fire and forget
		return { success: true, savedToServer: true };
	}
	
	return { success: true, savedToServer: false };
}

function formatThemeList(currentTheme: string): string {
	const lines: string[] = [
		'',
		'<span class="highlight">╔══════════════════════════════════════════════════════════╗</span>',
		`<span class="highlight">║</span>                    <span class="file-exec">${t('terminal.theme.available')}</span>                      <span class="highlight">║</span>`,
		'<span class="highlight">╠══════════════════════════════════════════════════════════╣</span>',
		''
	];

	for (const theme of AVAILABLE_THEMES) {
		const isActive = theme.name === currentTheme;
		const indicator = isActive ? '<span class="success">●</span>' : '<span class="text-muted">○</span>';
		const nameStyle = isActive ? 'success' : 'command';
		const activeLabel = isActive ? ` <span class="warning">${t('terminal.theme.active')}</span>` : '';

		lines.push(
			`  ${indicator} ${theme.preview} <span class="${nameStyle}">${theme.name.padEnd(12)}</span> ${t(theme.descriptionKey)}${activeLabel}`
		);
	}

	lines.push('');
	lines.push('<span class="highlight">╚══════════════════════════════════════════════════════════╝</span>');
	lines.push('');
	lines.push(`<span class="text-muted">${t('common.usage')}:</span> <span class="command">theme set</span> <span class="file-name">&lt;nombre&gt;</span>`);
	lines.push('');

	return lines.join('\n');
}

function formatCurrentTheme(themeName: string): string {
	const theme = AVAILABLE_THEMES.find((th) => th.name === themeName);
	if (!theme) {
		return `<span class="error">${t('terminal.theme.unknown')} ${themeName}</span>`;
	}

	return [
		'',
		`<span class="text-muted">${t('terminal.theme.current')}</span> ${theme.preview} <span class="success">${theme.name}</span>`,
		`<span class="text-muted">:</span> ${t(theme.descriptionKey)}`,
		''
	].join('\n');
}

function formatThemeChanged(themeName: string, savedToServer: boolean): string {
	const theme = AVAILABLE_THEMES.find((th) => th.name === themeName)!;
	const serverNote = savedToServer
		? `<span class="success">✓ ${t('terminal.theme.saved_default')}</span>`
		: `<span class="text-muted">💡 ${t('terminal.theme.login_to_save')}</span>`;

	return [
		'',
		`<span class="success">✓ ${t('terminal.theme.changed')}</span>`,
		'',
		`  ${theme.preview} <span class="highlight">${theme.name}</span> - ${t(theme.descriptionKey)}`,
		'',
		serverNote,
		''
	].join('\n');
}

function formatHelp(): string {
	return [
		'',
		`<span class="highlight">theme</span> - ${t('terminal.theme.title')}`,
		'',
		`<span class="text-muted">${t('common.usage')}:</span>`,
		`  <span class="command">theme</span>              ${t('terminal.theme.options.current')}`,
		`  <span class="command">theme list</span>        ${t('terminal.theme.options.list')}`,
		`  <span class="command">theme set</span> <span class="file-name">&lt;nombre&gt;</span>  ${t('terminal.theme.options.change')}`,
		`  <span class="command">theme -h</span>          ${t('terminal.theme.options.help')}`,
		'',
		`<span class="text-muted">${t('common.examples')}:</span>`,
		`  <span class="command">theme set dracula</span>   ${t('terminal.theme.examples.dracula')}`,
		`  <span class="command">theme set cyberpunk</span> ${t('terminal.theme.examples.cyberpunk')}`,
		''
	].join('\n');
}

export const theme: Command = {
	name: 'theme',
	description: t('terminal.theme.description'),
	usage: 'theme [list|set <nombre>|-h]',
	execute: (args: string[], context: CommandContext): CommandResult => {
		const currentTheme = getCurrentTheme();
		const isAuth = context.isAuthenticated || false;

		// Sin argumentos: mostrar tema actual
		if (args.length === 0) {
			return {
				output: formatCurrentTheme(currentTheme)
			};
		}

		const subcommand = args[0].toLowerCase();

		// Ayuda
		if (subcommand === '-h' || subcommand === '--help' || subcommand === 'help') {
			return {
				output: formatHelp()
			};
		}

		// Listar temas
		if (subcommand === 'list' || subcommand === 'ls') {
			return {
				output: formatThemeList(currentTheme)
			};
		}

		// Cambiar tema
		if (subcommand === 'set') {
			const themeName = args[1]?.toLowerCase();

			if (!themeName) {
				return {
					output: [
						'',
						`<span class="error">Error: ${t('terminal.theme.specify_name')}</span>`,
						'',
						`<span class="text-muted">${t('common.usage')}:</span> <span class="command">theme set</span> <span class="file-name">&lt;nombre&gt;</span>`,
						'',
						`<span class="text-muted"><span class="command">theme list</span></span>`,
						''
					].join('\n')
				};
			}

			const result = setTheme(themeName, isAuth);

			if (!result.success) {
				return {
					output: [
						'',
						`<span class="error">Error: "${themeName}" ${t('terminal.theme.not_found')}</span>`,
						'',
						`<span class="text-muted">${t('terminal.theme.available_themes')}</span> ` +
							AVAILABLE_THEMES.map((th) => `<span class="command">${th.name}</span>`).join(', '),
						''
					].join('\n')
				};
			}

			return {
				output: formatThemeChanged(themeName, result.savedToServer)
			};
		}

		// Si pasan directamente un nombre de tema (atajo)
		const directTheme = AVAILABLE_THEMES.find((t) => t.name === subcommand);
		if (directTheme) {
			const result = setTheme(subcommand, isAuth);
			return {
				output: formatThemeChanged(subcommand, result.savedToServer)
			};
		}

		// Comando no reconocido
		return {
			output: [
				'',
				`<span class="error">${t('terminal.theme.unknown_subcommand')} ${subcommand}</span>`,
				'',
				`<span class="text-muted">${t('common.usage')}:</span> <span class="command">theme [list|set &lt;nombre&gt;]</span>`,
				''
			].join('\n')
		};
	}
};

// Función para inicializar el tema al cargar la página
export async function initializeTheme(): Promise<void> {
	if (typeof window === 'undefined') return;

	// Primero intentar cargar el tema del servidor (tema del dueño)
	try {
		const response = await fetch('/api/settings/theme');
		if (response.ok) {
			const data = await response.json();
			const serverTheme = data.value;
			if (serverTheme && AVAILABLE_THEMES.find((t) => t.name === serverTheme)) {
				// Solo aplicar si el usuario no tiene un tema guardado localmente
				const localTheme = localStorage.getItem(THEME_STORAGE_KEY);
				if (!localTheme) {
					document.documentElement.setAttribute('data-theme', serverTheme);
					return;
				}
			}
		}
	} catch {
		// Si falla, seguir con localStorage
	}

	// Fallback a localStorage o default
	const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	if (savedTheme && AVAILABLE_THEMES.find((t) => t.name === savedTheme)) {
		document.documentElement.setAttribute('data-theme', savedTheme);
	} else {
		document.documentElement.setAttribute('data-theme', 'matrix');
	}
}

// Exportar lista de temas para uso externo
export const availableThemes = AVAILABLE_THEMES;
