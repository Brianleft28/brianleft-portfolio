import type { Command, CommandContext } from '../types';
import { getAllCommands } from './index';
import { t } from '$lib/i18n/helpers';

export const help: Command = {
	name: 'help',
	get description() {
		return t('terminal.help.description');
	},
	usage: 'help [-h] [command]',
	execute(args, ctx) {
		const commands = getAllCommands();
		const aiCmd = ctx?.aiCommandName || 'ai';
		const aiName = ctx?.aiDisplayName || 'AI Assistant';

		// Help flag
		if (args.includes('-h') || args.includes('--help')) {
			return {
				output: `<span class="command-highlight">help</span> - ${t('terminal.help.title')}

<span class="system-header">${t('common.usage').toUpperCase()}:</span>
  help              ${t('terminal.help.commands.help')}
  help &lt;${t('common.command')}&gt;    ${t('terminal.help.detailed_info')}

<span class="system-header">${t('common.examples').toUpperCase()}:</span>
  help ls           ${t('terminal.help.about', { name: 'ls' })}
  help ${aiCmd}     ${t('terminal.help.about', { name: aiName })}`,
				isHtml: true
			};
		}

		const cmdArg = args.find((a) => !a.startsWith('-'));
		if (cmdArg) {
			const cmd = commands.find((c) => c.name === cmdArg);
			if (!cmd) {
				return {
					output: `<span class="error-text">help: ${t('terminal.help.not_found', { name: cmdArg })}</span>`,
					isHtml: true
				};
			}
			return {
				output: `<span class="command-highlight">${cmd.name}</span> - ${cmd.description}\n\n<span class="system-header">${t('common.usage').toUpperCase()}:</span> ${cmd.usage || cmd.name}\n\n<span class="system-hint">${t('common.tip')}: ${t('terminal.help.more_options', { name: cmd.name })}</span>`,
				isHtml: true
			};
		}

		const lines = [
			`<span class="system-header">📚 ${t('terminal.help.available')}</span>`,
			'',
			`<span class="category-header">📁 ${t('terminal.help.categories.navigation')}</span>`,
			`   <span class="command-highlight">cd</span>        ${t('terminal.help.commands.cd')}`,
			`   <span class="command-highlight">ls</span>        ${t('terminal.help.commands.ls')}`,
			`   <span class="command-highlight">pwd</span>       ${t('terminal.help.commands.pwd')}`,
			`   <span class="command-highlight">tree</span>      ${t('terminal.help.commands.tree')}`,
			'',
			`<span class="category-header">📄 ${t('terminal.help.categories.files')}</span>`,
			`   <span class="command-highlight">cat</span>       ${t('terminal.help.commands.cat')}`,
			`   <span class="command-highlight">cv</span>        ${t('terminal.help.commands.cv')}`,
			'',
			`<span class="category-header">🤖 ${t('terminal.help.categories.ai')}</span>`,
			`   <span class="command-highlight">${aiCmd}</span>      ${aiName} - ${t('terminal.help.commands.ai_modes')}`,

			'',
			`<span class="category-header">🎨 ${t('terminal.help.categories.customization')}</span>`,
			`   <span class="command-highlight">theme</span>     ${t('terminal.help.commands.theme')}`,
			`   <span class="command-highlight">lang</span>      ${t('terminal.help.commands.lang')}`,
			'',
			`<span class="category-header">⚙️ ${t('terminal.help.categories.terminal')}</span>`,
			`   <span class="command-highlight">whoami</span>    ${t('terminal.help.commands.whoami')}`,
			`   <span class="command-highlight">cls</span>       ${t('terminal.help.commands.clear')}`,
			`   <span class="command-highlight">help</span>      ${t('terminal.help.commands.help')}`,
			`   <span class="command-highlight">exit</span>      ${t('terminal.help.commands.exit')}`,
			'',
			`<span class="system-hint">💡 ${t('terminal.help.hint_detail')}</span>`,
			`<span class="system-hint">💡 ${t('terminal.help.hint_options')}</span>`
		];

		return { output: lines.join('\n'), isHtml: true };
	}
};
