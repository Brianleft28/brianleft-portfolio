import type { Command } from '../types';
import type { FolderNode, FileNode } from '$lib/data/file-system';
import { t } from '$lib/i18n/helpers';

export const ls: Command = {
	name: 'ls',
	description: t('terminal.ls.description'),
	usage: 'ls [-h] [-l]',
	execute(args, ctx) {
		// Help flag
		if (args?.includes('-h') || args?.includes('--help')) {
			return {
				output: `<span class="command-highlight">ls</span> - ${t('terminal.ls.description')}

<span class="system-header">${t('common.usage').toUpperCase()}:</span>
  ls              ${t('terminal.ls.options.compact')}
  ls -l           ${t('terminal.ls.options.detailed')}

<span class="system-header">${t('common.options').toUpperCase()}:</span>
  -h, --help      ${t('terminal.ls.options.help')}
  -l              ${t('terminal.ls.long_format')}

<span class="system-header">ALIASES:</span>
  dir             ${t('terminal.ls.same_as_ls')}
  ll              ${t('terminal.ls.same_as_ls_l')}`,
				isHtml: true
			};
		}

		const node = ctx.getNodeAtPath(ctx.currentPath);

		if (!node || node.type !== 'folder') {
			return { output: `<span class="error-text">ls: ${t('terminal.ls.errors.not_accessible')} '${ctx.currentPath}': ${t('terminal.ls.errors.not_directory')}</span>`, isHtml: true };
		}

		const folder = node as FolderNode;

		if (folder.children.length === 0) {
			return { output: `<span class="system-hint">${t('terminal.ls.empty_directory')}</span>`, isHtml: true };
		}

		const longFormat = args?.includes('-l');

		if (longFormat) {
			// Formato largo
			const lines: string[] = [
				`<span class="system-hint">total ${folder.children.length}</span>`
			];

			for (const child of folder.children) {
				if (child.type === 'folder') {
					const subFolder = child as FolderNode;
					const count = subFolder.children?.length || 0;
					lines.push(`📁 <span class="folder-name">${child.name.padEnd(20)}</span> <span class="system-hint">${count} items</span>`);
				} else {
					const file = child as FileNode;
					const size = file.content ? `${file.content.length} chars` : 'empty';
					const icon = child.name.endsWith('.md') ? '📄' : '📋';
					lines.push(`${icon} <span class="file-name">${child.name.padEnd(20)}</span> <span class="system-hint">${size}</span>`);
				}
			}

			return { output: lines.join('\n'), isHtml: true };
		}

		// Formato compacto
		const items = folder.children.map((child) => {
			if (child.type === 'folder') {
				return `📁 <span class="folder-name">${child.name}/</span>`;
			}
			const icon = child.name.endsWith('.md') ? '📄' : '📋';
			return `${icon} <span class="file-name">${child.name}</span>`;
		});

		return { output: items.join('  '), isHtml: true };
	}
};
