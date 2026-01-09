import type { Command, CommandContext, AiMode } from '../types';

export const AI_MODES: Record<string, AiMode> = {
	arquitecto: {
		name: 'arquitecto',
		description: 'Diseño de sistemas y arquitectura de software',
		systemPrompt: 'Sos el arquitecto de software personal de Brian Benegas. Analizás sus proyectos con ojo crítico, mentalidad de escalabilidad empresarial. Conocés su stack: SvelteKit, NestJS, TypeScript, Docker. Hablás en español rioplatense, directo y técnico.'
	},
	debugger: {
		name: 'debugger',
		description: 'Análisis y resolución de bugs',
		systemPrompt: 'Sos el debugger personal de Brian Benegas. Tu único objetivo es encontrar la causa raíz de errores en sus proyectos. Pedís stack traces, logs, y hacés preguntas precisas. Conocés su stack: SvelteKit, NestJS, TypeScript, Docker. Español rioplatense, directo.'
	},
	documentador: {
		name: 'documentador',
		description: 'Generación de documentación técnica',
		systemPrompt: 'Sos el technical writer personal de Brian Benegas. Generás documentación clara y profesional para sus proyectos: READMEs, arquitectura, APIs. Seguís el principio "docs-as-code". Conocés su stack: SvelteKit, NestJS, TypeScript, Docker. Output en Markdown.'
	}
};

export const torvalds: Command = {
	name: 'torvalds',
	description: 'Asistente AI con modos especializados',
	usage: 'torvalds <subcomando> [args]',

	execute(args, ctx) {
		const subcommand = args[0];

		if (!subcommand) {
			return showTorvaldsHelp();
		}

		switch (subcommand) {
			case 'start':
				return startAi(args[1], ctx);
			case 'stop':
				return stopAi(ctx);
			case 'mode':
				return changeMode(args[1], ctx);
			case 'modes':
				return listModes();
			case 'status':
				return showStatus(ctx);
			default:
				return {
					output: `'${subcommand}' no es un subcomando válido\nUsa 'torvalds' para ver la ayuda`
				};
		}
	}
};

function showTorvaldsHelp() {
	const lines = [
		'<span class="ai-header">╔══════════════════════════════════════╗</span>',
		'<span class="ai-header">║     🐧 TorvaldsAI - Terminal AI      ║</span>',
		'<span class="ai-header">╚══════════════════════════════════════╝</span>',
		'',
		'<span class="system-header">Uso:</span> torvalds &lt;subcomando&gt; [opciones]',
		'',
		'<span class="system-header">Subcomandos:</span>',
		'  <span class="command-highlight">start [modo]</span>  Inicia sesión AI',
		'  <span class="command-highlight">stop</span>          Termina sesión AI',
		'  <span class="command-highlight">mode &lt;modo&gt;</span>   Cambia el modo activo',
		'  <span class="command-highlight">modes</span>         Lista modos disponibles',
		'  <span class="command-highlight">status</span>        Muestra estado actual',
		'',
		'<span class="system-header">Modos disponibles:</span>',
		'  <span class="mode-name">arquitecto</span>   - Diseño de sistemas',
		'  <span class="mode-name">debugger</span>     - Análisis de bugs',
		'  <span class="mode-name">documentador</span> - Documentación técnica',
		'',
		'<span class="system-hint">Ejemplo: torvalds start arquitecto</span>'
	];
	return { output: lines.join('\n'), isHtml: true };
}

function startAi(mode: string | undefined, ctx: CommandContext) {
	const selectedMode = mode || 'arquitecto';

	if (!AI_MODES[selectedMode]) {
		return {
			output: `Modo '${selectedMode}' no existe\nUsa 'torvalds modes' para ver los disponibles`
		};
	}

	ctx.setAiMode(selectedMode);

	const modeInfo = AI_MODES[selectedMode];
	const lines = [
		'<span class="ai-success">✓ TorvaldsAI iniciado</span>',
		'',
		`<span class="system-header">Modo activo:</span> <span class="mode-name">${modeInfo.name}</span>`,
		`<span class="system-header">Descripción:</span> ${modeInfo.description}`,
		'',
		'<span class="ai-prompt">🐧 Escribe tu consulta directamente...</span>',
		'<span class="system-hint">Usa "torvalds stop" o "exit" para terminar</span>'
	];

	return { output: lines.join('\n'), isHtml: true };
}

function stopAi(ctx: CommandContext) {
	if (!ctx.aiMode) {
		return { output: 'No hay sesión activa' };
	}

	ctx.setAiMode(null);
	return { output: '<span class="ai-warning">TorvaldsAI desactivado. Chau! 👋</span>', isHtml: true };
}

function changeMode(mode: string | undefined, ctx: CommandContext) {
	if (!ctx.aiMode) {
		return { output: 'Primero inicia una sesión con "torvalds start"' };
	}

	if (!mode) {
		return { output: 'Especifica un modo\nUso: torvalds mode <modo>' };
	}

	if (!AI_MODES[mode]) {
		return { output: `Modo '${mode}' no existe` };
	}

	ctx.setAiMode(mode);

	let modeMessage = `<span class="ai-success">✓ Modo cambiado a:</span> <span class="mode-name">${mode}</span>`;
	switch (mode) {
		case 'arquitecto':
			modeMessage += '<br><span class="system-hint">Visión macro activada. ¿Qué sistema analizamos?</span>';
			break;
		case 'debugger':
			modeMessage += '<br><span class="system-hint">Modo detective. Dame un stack trace.</span>';
			break;
		case 'documentador':
			modeMessage += '<br><span class="system-hint">Generador de READMEs listo. ¿Qué documentamos?</span>';
			break;
	}

	return { output: modeMessage, isHtml: true };
}

function listModes() {
	const lines = ['<span class="system-header">Modos de TorvaldsAI:</span>', ''];

	for (const [key, mode] of Object.entries(AI_MODES)) {
		lines.push(`  <span class="mode-name">${key.padEnd(14)}</span> ${mode.description}`);
	}

	return { output: lines.join('\n'), isHtml: true };
}

function showStatus(ctx: CommandContext) {
	if (!ctx.aiMode) {
		return { output: '<span class="ai-warning">TorvaldsAI: inactivo</span>', isHtml: true };
	}

	const mode = AI_MODES[ctx.aiMode];
	const lines = [
		'<span class="ai-header">Estado de TorvaldsAI</span>',
		'',
		'<span class="system-header">Estado:</span> <span class="ai-success">activo</span>',
		`<span class="system-header">Modo:</span> <span class="mode-name">${mode.name}</span>`,
		`<span class="system-header">Descripción:</span> ${mode.description}`
	];

	return { output: lines.join('\n'), isHtml: true };
}
