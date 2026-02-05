import type { Command, CommandContext } from '../types';
import { getAllCommands } from './index';
import { t } from '$lib/i18n/helpers';

export const help: Command = {
	name: 'help',
	description: t('terminal.help.description'),
	usage: 'help [-h] [comando]',
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
  help &lt;comando&gt;    Info detallada de un comando

<span class="system-header">${t('common.examples').toUpperCase()}:</span>
  help ls           Ayuda sobre ls
  help ${aiCmd}     Ayuda sobre ${aiName}`,
				isHtml: true
			};
		}

		const cmdArg = args.find((a) => !a.startsWith('-'));
		if (cmdArg) {
			const cmd = commands.find((c) => c.name === cmdArg);
			if (!cmd) {
				return {
					output: `<span class="error-text">help: comando '${cmdArg}' no encontrado</span>`,
					isHtml: true
				};
			}
			return {
				output: `<span class="command-highlight">${cmd.name}</span> - ${cmd.description}\n\n<span class="system-header">${t('common.usage').toUpperCase()}:</span> ${cmd.usage || cmd.name}\n\n<span class="system-hint">${t('common.tip')}: ${cmd.name} -h para más opciones</span>`,
				isHtml: true
			};
		}

		const lines = [
			`<span class="system-header">📚 COMANDOS DISPONIBLES</span>`,
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
			`   <span class="command-highlight">apikey</span>    ${t('terminal.help.commands.apikey')}`,
			'',
			`<span class="category-header">🔐 ${t('terminal.help.categories.account')}</span>`,
			`   <span class="command-highlight">register</span>  ${t('terminal.help.commands.register')}`,
			`   <span class="command-highlight">email</span>     ${t('terminal.help.commands.email')}`,
			`   <span class="command-highlight">admin</span>     ${t('terminal.help.commands.admin')}`,
			'',
			`<span class="category-header">🎨 ${t('terminal.help.categories.customization')}</span>`,
			`   <span class="command-highlight">theme</span>     ${t('terminal.help.commands.theme')}`,
			'',
			`<span class="category-header">⚙️ ${t('terminal.help.categories.terminal')}</span>`,
			`   <span class="command-highlight">cls</span>       ${t('terminal.help.commands.clear')}`,
			`   <span class="command-highlight">help</span>      ${t('terminal.help.commands.help')}`,
			`   <span class="command-highlight">exit</span>      ${t('terminal.help.commands.exit')}`,
			'',
			`<span class="system-hint">💡 help &lt;comando&gt; para info detallada</span>`,
			`<span class="system-hint">💡 &lt;comando&gt; -h para opciones</span>`
		];

		return { output: lines.join('\n'), isHtml: true };
	}
};
