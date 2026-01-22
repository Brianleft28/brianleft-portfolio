import type { Command, CommandContext, CommandResult } from '../types';

interface ThemeDefinition {
	name: string;
	description: string;
	preview: string; // emoji o símbolo para mostrar
}

const AVAILABLE_THEMES: ThemeDefinition[] = [
	{ name: 'matrix', description: 'Hacker verde clásico', preview: '🟢' },
	{ name: 'dracula', description: 'Violetas y rosas elegantes', preview: '🧛' },
	{ name: 'monokai', description: 'Colores vibrantes retro', preview: '🎨' },
	{ name: 'nord', description: 'Tonos azules árticos', preview: '❄️' },
	{ name: 'cyberpunk', description: 'Neón magenta y cyan', preview: '🌆' },
	{ name: 'solarized', description: 'Científico y legible', preview: '☀️' },
	{ name: 'gruvbox', description: 'Retro warm tones', preview: '🟤' }
];

const THEME_STORAGE_KEY = 'portfolio-theme';

function getCurrentTheme(): string {
	if (typeof window === 'undefined') return 'matrix';
	return localStorage.getItem(THEME_STORAGE_KEY) || 'matrix';
}

function setTheme(themeName: string): boolean {
	const validTheme = AVAILABLE_THEMES.find((t) => t.name === themeName);
	if (!validTheme) return false;

	if (typeof window !== 'undefined') {
		// Guardar en localStorage
		localStorage.setItem(THEME_STORAGE_KEY, themeName);

		// Aplicar al document
		document.documentElement.setAttribute('data-theme', themeName);
	}
	return true;
}

function formatThemeList(currentTheme: string): string {
	const lines: string[] = [
		'',
		'<span class="highlight">╔══════════════════════════════════════════════════════════╗</span>',
		'<span class="highlight">║</span>                    <span class="file-exec">TEMAS DISPONIBLES</span>                      <span class="highlight">║</span>',
		'<span class="highlight">╠══════════════════════════════════════════════════════════╣</span>',
		''
	];

	for (const theme of AVAILABLE_THEMES) {
		const isActive = theme.name === currentTheme;
		const indicator = isActive ? '<span class="success">●</span>' : '<span class="text-muted">○</span>';
		const nameStyle = isActive ? 'success' : 'command';
		const activeLabel = isActive ? ' <span class="warning">[ACTIVO]</span>' : '';

		lines.push(
			`  ${indicator} ${theme.preview} <span class="${nameStyle}">${theme.name.padEnd(12)}</span> ${theme.description}${activeLabel}`
		);
	}

	lines.push('');
	lines.push('<span class="highlight">╚══════════════════════════════════════════════════════════╝</span>');
	lines.push('');
	lines.push('<span class="text-muted">Uso:</span> <span class="command">theme set</span> <span class="file-name">&lt;nombre&gt;</span>');
	lines.push('');

	return lines.join('\n');
}

function formatCurrentTheme(themeName: string): string {
	const theme = AVAILABLE_THEMES.find((t) => t.name === themeName);
	if (!theme) {
		return `<span class="error">Tema actual desconocido: ${themeName}</span>`;
	}

	return [
		'',
		`<span class="text-muted">Tema actual:</span> ${theme.preview} <span class="success">${theme.name}</span>`,
		`<span class="text-muted">Descripción:</span> ${theme.description}`,
		''
	].join('\n');
}

function formatThemeChanged(themeName: string): string {
	const theme = AVAILABLE_THEMES.find((t) => t.name === themeName)!;

	return [
		'',
		'<span class="success">✓ Tema cambiado exitosamente</span>',
		'',
		`  ${theme.preview} <span class="highlight">${theme.name}</span> - ${theme.description}`,
		'',
		'<span class="text-muted">El tema se ha guardado y persistirá entre sesiones.</span>',
		''
	].join('\n');
}

function formatHelp(): string {
	return [
		'',
		'<span class="highlight">theme</span> - Sistema de temas visuales',
		'',
		'<span class="text-muted">Uso:</span>',
		'  <span class="command">theme</span>              Muestra el tema actual',
		'  <span class="command">theme list</span>        Lista todos los temas disponibles',
		'  <span class="command">theme set</span> <span class="file-name">&lt;nombre&gt;</span>  Cambia al tema especificado',
		'  <span class="command">theme -h</span>          Muestra esta ayuda',
		'',
		'<span class="text-muted">Ejemplos:</span>',
		'  <span class="command">theme set dracula</span>   Cambia al tema Dracula',
		'  <span class="command">theme set cyberpunk</span> Cambia al tema Cyberpunk',
		''
	].join('\n');
}

export const theme: Command = {
	name: 'theme',
	description: 'Cambia el tema visual de la terminal y el sitio',
	usage: 'theme [list|set <nombre>|-h]',
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	execute: (args: string[], _context: CommandContext): CommandResult => {
		const currentTheme = getCurrentTheme();

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
						'<span class="error">Error: Debes especificar un nombre de tema</span>',
						'',
						'<span class="text-muted">Uso:</span> <span class="command">theme set</span> <span class="file-name">&lt;nombre&gt;</span>',
						'',
						'<span class="text-muted">Ejecuta</span> <span class="command">theme list</span> <span class="text-muted">para ver los temas disponibles.</span>',
						''
					].join('\n')
				};
			}

			const success = setTheme(themeName);

			if (!success) {
				return {
					output: [
						'',
						`<span class="error">Error: Tema "${themeName}" no encontrado</span>`,
						'',
						'<span class="text-muted">Temas disponibles:</span> ' +
							AVAILABLE_THEMES.map((t) => `<span class="command">${t.name}</span>`).join(', '),
						''
					].join('\n')
				};
			}

			return {
				output: formatThemeChanged(themeName)
			};
		}

		// Si pasan directamente un nombre de tema (atajo)
		const directTheme = AVAILABLE_THEMES.find((t) => t.name === subcommand);
		if (directTheme) {
			setTheme(subcommand);
			return {
				output: formatThemeChanged(subcommand)
			};
		}

		// Comando no reconocido
		return {
			output: [
				'',
				`<span class="error">Subcomando desconocido: ${subcommand}</span>`,
				'',
				'<span class="text-muted">Uso:</span> <span class="command">theme [list|set &lt;nombre&gt;]</span>',
				''
			].join('\n')
		};
	}
};

// Función para inicializar el tema al cargar la página
export function initializeTheme(): void {
	if (typeof window === 'undefined') return;

	const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	if (savedTheme && AVAILABLE_THEMES.find((t) => t.name === savedTheme)) {
		document.documentElement.setAttribute('data-theme', savedTheme);
	} else {
		// Default a matrix
		document.documentElement.setAttribute('data-theme', 'matrix');
	}
}

// Exportar lista de temas para uso externo
export const availableThemes = AVAILABLE_THEMES;
