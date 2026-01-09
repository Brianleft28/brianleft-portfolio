import type { Command } from '../types';
import { getAllCommands } from './index';

export const help: Command = {
	name: 'help',
	description: 'Muestra esta ayuda',
	usage: 'help [-h] [comando]',
	execute(args) {
		const commands = getAllCommands();

		// Help flag
		if (args.includes('-h') || args.includes('--help')) {
			return {
				output: `<span class="command-highlight">help</span> - Sistema de ayuda

<span class="system-header">USO:</span>
  help              Lista todos los comandos
  help &lt;comando&gt;    Info detallada de un comando

<span class="system-header">EJEMPLOS:</span>
  help ls           Ayuda sobre ls
  help torvalds     Ayuda sobre el asistente AI`,
				isHtml: true
			};
		}

		const cmdArg = args.find(a => !a.startsWith('-'));
		if (cmdArg) {
			const cmd = commands.find((c) => c.name === cmdArg);
			if (!cmd) {
				return { output: `<span class="error-text">help: comando '${cmdArg}' no encontrado</span>`, isHtml: true };
			}
			return {
				output: `<span class="command-highlight">${cmd.name}</span> - ${cmd.description}\n\n<span class="system-header">USO:</span> ${cmd.usage || cmd.name}\n\n<span class="system-hint">Tip: ${cmd.name} -h para más opciones</span>`,
				isHtml: true
			};
		}

		const lines = [
			'<pre class="help-box">╔══════════════════════════════════════════════════════╗',
			'║  <span class="system-header">📚 COMANDOS DISPONIBLES</span>                           ║',
			'╠══════════════════════════════════════════════════════╣',
			'║                                                      ║',
			'║  <span class="category-header">📁 NAVEGACIÓN</span>                                     ║',
			'║     <span class="command-highlight">cd</span>        Cambiar directorio                   ║',
			'║     <span class="command-highlight">ls</span>        Listar archivos y carpetas           ║',
			'║     <span class="command-highlight">pwd</span>       Mostrar directorio actual            ║',
			'║     <span class="command-highlight">tree</span>      Árbol de directorios                 ║',
			'║                                                      ║',
			'║  <span class="category-header">📄 ARCHIVOS</span>                                       ║',
			'║     <span class="command-highlight">cat</span>       Ver contenido de archivo             ║',
			'║                                                      ║',
			'║  <span class="category-header">⚙️ TERMINAL</span>                                       ║',
			'║     <span class="command-highlight">cls</span>       Limpiar consola (Ctrl+L)             ║',
			'║     <span class="command-highlight">help</span>      Mostrar esta ayuda                   ║',
			'║     <span class="command-highlight">exit</span>      Cerrar terminal                      ║',
			'║                                                      ║',
			'║  <span class="category-header">🐧 INTELIGENCIA ARTIFICIAL</span>                        ║',
			'║     <span class="command-highlight">torvalds</span>  Asistente AI con modos               ║',
			'║                                                      ║',
			'╠══════════════════════════════════════════════════════╣',
			'║  <span class="system-hint">💡 help &lt;comando&gt;</span>    Info detallada                ║',
			'║  <span class="system-hint">💡 &lt;comando&gt; -h</span>      Opciones y ejemplos           ║',
			'║  <span class="system-hint">💡 Ctrl+L</span>            Limpiar consola               ║',
			'╚══════════════════════════════════════════════════════╝</pre>'
		];

		return { output: lines.join('\n'), isHtml: true };
	}
};
