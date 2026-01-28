import type { Command, CommandContext, CommandResult } from '../types';

const adminCommand: Command = {
	name: 'admin',
	description: 'Abrir panel de administración',
	usage: 'admin [sección]',

	execute(args: string[], context: CommandContext): CommandResult {
		const section = args[0]?.toLowerCase() || '';
		
		// Mapeo de secciones
		const sections: Record<string, { url: string; label: string; icon: string }> = {
			'': { url: '/admin/login', label: 'Panel Admin', icon: '🔐' },
			'login': { url: '/admin/login', label: 'Login', icon: '🔐' },
			'settings': { url: '/admin/settings', label: 'Configuración', icon: '⚙️' },
			'config': { url: '/admin/settings', label: 'Configuración', icon: '⚙️' },
			'uploads': { url: '/admin/uploads', label: 'Archivos', icon: '📁' },
			'files': { url: '/admin/uploads', label: 'Archivos', icon: '📁' },
			'projects': { url: '/admin/projects', label: 'Proyectos', icon: '📂' },
		};

		const target = sections[section];
		
		if (!target) {
			return {
				output: `❌ Sección desconocida: "${section}"

Secciones disponibles:
  • <a href="/admin/login" target="_blank">login</a> — Iniciar sesión
  • <a href="/admin/settings" target="_blank">settings</a> — Configuración del portfolio
  • <a href="/admin/uploads" target="_blank">uploads</a> — Gestión de archivos
  • <a href="/admin/projects" target="_blank">projects</a> — Gestión de proyectos

Ejemplo: <code>admin settings</code>`,
				isHtml: true
			};
		}

		// Abrir en nueva pestaña
		if (typeof window !== 'undefined') {
			window.open(target.url, '_blank');
		}

		return {
			output: `${target.icon} Abriendo <a href="${target.url}" target="_blank"><strong>${target.label}</strong></a> en nueva pestaña...

<span style="color: #888">💡 Tip: Usa <code>admin -h</code> para ver todas las secciones disponibles.</span>`,
			isHtml: true
		};
	},
};

export default adminCommand;
