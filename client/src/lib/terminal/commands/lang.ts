import type { Command, CommandResult } from '../types';
import { t, getCurrentLocale, setLocale } from '$lib/i18n/helpers';

interface LanguageDefinition {
	code: string;
	name: string;
	flag: string;
}

const AVAILABLE_LANGUAGES: LanguageDefinition[] = [
	{ code: 'es', name: 'Español', flag: '🇪🇸' },
	{ code: 'en', name: 'English', flag: '🇬🇧' }
];

/**
 * Comando lang - Gestiona el idioma de la interfaz
 */
export const lang: Command = {
	name: 'lang',
	description: t('terminal.lang.description'),
	usage: 'lang [list|set <código>|-h]',

	execute(args): CommandResult {
		const currentLang = getCurrentLocale();

		// Sin argumentos: mostrar idioma actual
		if (!args.length) {
			return formatCurrentLang(currentLang);
		}

		const subcommand = args[0].toLowerCase();

		// Ayuda
		if (subcommand === '-h' || subcommand === '--help' || subcommand === 'help') {
			return showHelp();
		}

		// Listar idiomas
		if (subcommand === 'list' || subcommand === 'ls') {
			return formatLangList(currentLang);
		}

		// Cambiar idioma
		if (subcommand === 'set') {
			const langCode = args[1]?.toLowerCase();

			if (!langCode) {
				return {
					output: `<span class="error-text">❌ ${t('terminal.lang.errors.code_required')}</span>
${t('common.usage')}: <span class="command-highlight">lang set &lt;${t('terminal.lang.code')}&gt;</span>

<span class="system-hint">${t('terminal.lang.run_list')}</span>`,
					isHtml: true
				};
			}

			const validLang = AVAILABLE_LANGUAGES.find(l => l.code === langCode);
			if (!validLang) {
				return {
					output: `<span class="error-text">❌ "${langCode}" ${t('terminal.lang.errors.not_found')}</span>

<span class="system-hint">${t('terminal.lang.available')}:</span> ${AVAILABLE_LANGUAGES.map(l => `<span class="command-highlight">${l.code}</span>`).join(', ')}`,
					isHtml: true
				};
			}

			// Cambiar idioma
			setLocale(langCode);

			// Notificar cambio
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('locale:change', { detail: { locale: langCode } }));
			}

			return {
				output: `<span class="ai-success">✅ ${t('terminal.lang.changed')}</span>

  ${validLang.flag} <span class="highlight">${validLang.name}</span> (${validLang.code})

<span class="system-hint">💡 ${t('terminal.lang.reload_hint')}</span>`,
				isHtml: true
			};
		}

		// Atajo: si pasan directamente un código de idioma
		const directLang = AVAILABLE_LANGUAGES.find(l => l.code === subcommand);
		if (directLang) {
			setLocale(subcommand);

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('locale:change', { detail: { locale: subcommand } }));
			}

			return {
				output: `<span class="ai-success">✅ ${t('terminal.lang.changed')}</span>

  ${directLang.flag} <span class="highlight">${directLang.name}</span> (${directLang.code})

<span class="system-hint">💡 ${t('terminal.lang.reload_hint')}</span>`,
				isHtml: true
			};
		}

		// Comando no reconocido
		return {
			output: `<span class="error-text">❌ ${t('terminal.lang.errors.unknown')}: ${subcommand}</span>

${t('common.usage')}: <span class="command-highlight">lang [list|set &lt;${t('terminal.lang.code')}&gt;]</span>`,
			isHtml: true
		};
	}
};

function showHelp(): CommandResult {
	return {
		output: `<span class="system-header">🌐 ${t('terminal.lang.title')}</span>

<span class="category-header">${t('common.usage')}:</span>
  <span class="command-highlight">lang</span>              ${t('terminal.lang.options.current')}
  <span class="command-highlight">lang list</span>         ${t('terminal.lang.options.list')}
  <span class="command-highlight">lang set &lt;${t('terminal.lang.code')}&gt;</span>   ${t('terminal.lang.options.change')}
  <span class="command-highlight">lang -h</span>           ${t('terminal.lang.options.help')}

<span class="category-header">${t('common.examples')}:</span>
  <span class="command-highlight">lang set en</span>       ${t('terminal.lang.examples.english')}
  <span class="command-highlight">lang set es</span>       ${t('terminal.lang.examples.spanish')}
  <span class="command-highlight">lang es</span>           ${t('terminal.lang.examples.shortcut')}

<span class="category-header">${t('terminal.lang.available')}:</span>
${AVAILABLE_LANGUAGES.map(l => `  ${l.flag} <span class="command-highlight">${l.code}</span>  ${l.name}`).join('\n')}

<span class="system-hint">💡 ${t('terminal.lang.persistence_note')}</span>`,
		isHtml: true
	};
}

function formatCurrentLang(currentCode: string): CommandResult {
	const lang = AVAILABLE_LANGUAGES.find(l => l.code === currentCode);
	if (!lang) {
		return {
			output: `<span class="ai-warning">⚠️ ${t('terminal.lang.errors.unknown_current')}: ${currentCode}</span>`,
			isHtml: true
		};
	}

	return {
		output: `<span class="category-header">${t('terminal.lang.current')}:</span>

  ${lang.flag} <span class="highlight">${lang.name}</span> (${lang.code})

<span class="system-hint">${t('common.tip')}: <code>lang list</code> ${t('terminal.lang.see_available')}</span>
<span class="system-hint">${t('common.tip')}: <code>lang set &lt;${t('terminal.lang.code')}&gt;</code> ${t('terminal.lang.to_change')}</span>`,
		isHtml: true
	};
}

function formatLangList(currentCode: string): CommandResult {
	const lines: string[] = [
		'',
		'<span class="highlight">╔════════════════════════════════════════╗</span>',
		`<span class="highlight">║</span>        <span class="file-exec">${t('terminal.lang.available').toUpperCase()}</span>          <span class="highlight">║</span>`,
		'<span class="highlight">╠════════════════════════════════════════╣</span>',
		''
	];

	for (const lang of AVAILABLE_LANGUAGES) {
		const isActive = lang.code === currentCode;
		const indicator = isActive ? '<span class="success">●</span>' : '<span class="text-muted">○</span>';
		const nameStyle = isActive ? 'success' : 'command';
		const activeLabel = isActive ? ` <span class="warning">[${t('terminal.lang.active')}]</span>` : '';

		lines.push(
			`  ${indicator} ${lang.flag} <span class="${nameStyle}">${lang.code.padEnd(4)}</span> ${lang.name}${activeLabel}`
		);
	}

	lines.push('');
	lines.push('<span class="highlight">╚════════════════════════════════════════╝</span>');
	lines.push('');
	lines.push(`<span class="text-muted">${t('common.usage')}:</span> <span class="command">lang set</span> <span class="file-name">&lt;${t('terminal.lang.code')}&gt;</span>`);
	lines.push('');

	return {
		output: lines.join('\n'),
		isHtml: true
	};
}

export default lang;
