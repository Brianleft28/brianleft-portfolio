import type { Command, CommandContext } from '../types';
import { getAllCommands } from './index';

export const help: Command = {
	name: 'help',
	description: 'Muestra esta ayuda',
	usage: 'help [-h] [comando]',
	execute(args, ctx) {
		const commands = getAllCommands();
		const aiCmd = ctx?.aiCommandName || 'ai';
		const aiName = ctx?.aiDisplayName || 'Asistente AI';

		// Help flag
		if (args.includes('-h') || args.includes('--help')) {
			return {
				output: `<span class="command-highlight">help</span> - Sistema de ayuda

<span class="system-header">USO:</span>
  help              Lista todos los comandos
  help &lt;comando&gt;    Info detallada de un comando

<span class="system-header">EJEMPLOS:</span>
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
				output: `<span class="command-highlight">${cmd.name}</span> - ${cmd.description}\n\n<span class="system-header">USO:</span> ${cmd.usage || cmd.name}\n\n<span class="system-hint">Tip: ${cmd.name} -h para más opciones</span>`,
				isHtml: true
			};
		}

		const lines = [
			`<span class="system-header">📚 COMANDOS DISPONIBLES</span>`,
			'',
			`<span class="category-header">📁 Navegación</span>`,
			`   <span class="command-highlight">cd</span>        Cambiar directorio`,
			`   <span class="command-highlight">ls</span>        Listar archivos y carpetas`,
			`   <span class="command-highlight">pwd</span>       Mostrar directorio actual`,
			`   <span class="command-highlight">tree</span>      Árbol de directorios`,
			'',
			`<span class="category-header">📄 Archivos</span>`,
			`   <span class="command-highlight">cat</span>       Ver contenido de archivo`,
			`   <span class="command-highlight">cv</span>        Descargar curriculum vitae`,
			'',
			`<span class="category-header">🤖 Inteligencia Artificial</span>`,
			`   <span class="command-highlight">${aiCmd}</span>      ${aiName} - Modos especializados`,
			`   <span class="command-highlight">apikey</span>    Configura tu API key de Gemini`,
			'',
			`<span class="category-header">🔐 Cuenta & Admin</span>`,
			`   <span class="command-highlight">register</span>  Crear cuenta (obtén tu subdominio)`,
			`   <span class="command-highlight">email</span>     Ver o cambiar tu email (login)`,
			`   <span class="command-highlight">admin</span>     Abrir panel de administración`,
			'',
			`<span class="category-header">🎨 Personalización</span>`,
			`   <span class="command-highlight">theme</span>     Cambiar tema de colores`,
			'',
			`<span class="category-header">⚙️ Terminal</span>`,
			`   <span class="command-highlight">cls</span>       Limpiar consola (Ctrl+L)`,
			`   <span class="command-highlight">help</span>      Mostrar esta ayuda`,
			`   <span class="command-highlight">exit</span>      Cerrar terminal (Ctrl+Ñ)`,
			'',
			`<span class="system-hint">💡 help &lt;comando&gt; para info detallada</span>`,
			`<span class="system-hint">💡 &lt;comando&gt; -h para opciones</span>`
		];

		return { output: lines.join('\n'), isHtml: true };
	}
};
