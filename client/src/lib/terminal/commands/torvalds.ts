import type { Command, CommandContext, AiMode } from '../types';

// Modos por defecto - se pueden sobrescribir desde config
// White Label: sin referencias a "torvalds"
export const DEFAULT_AI_MODES: Record<string, AiMode> = {
	arquitecto: {
		name: 'arquitecto',
		description: 'Diseño de sistemas y arquitectura de software',
		systemPrompt:
			'Sos un arquitecto de software senior. Analizás proyectos con mentalidad de escalabilidad y buenas prácticas. Hablás en español de forma técnica pero accesible.'
	},
	asistente: {
		name: 'asistente',
		description: 'Asistente general para consultas sobre el portfolio',
		systemPrompt:
			'Sos un asistente profesional del portfolio. Respondés consultas sobre proyectos y experiencia de forma clara y directa. Hablás en español argentino.'
	}
};

// Modos configurables desde runtime
let AI_MODES: Record<string, AiMode> = { ...DEFAULT_AI_MODES };

export function setAiModes(modes: Record<string, AiMode>) {
	AI_MODES = modes;
}

export function getAiModes(): Record<string, AiMode> {
	return AI_MODES;
}

export const torvalds: Command = {
	name: 'ai',
	description: 'Asistente AI con modos especializados',
	usage: 'ai [subcomando] [args] o ai <pregunta directa>',

	execute(args, ctx) {
		const subcommand = args[0];
		const aiName = ctx?.aiDisplayName || 'AI Assistant';
		const aiCmd = ctx?.aiCommandName || 'ai';

		// Si no hay argumentos, iniciar en modo arquitecto directamente
		if (!subcommand) {
			return startAi(undefined, ctx, aiName, aiCmd);
		}

		// Verificar si es un subcomando válido
		const validSubcommands = ['start', 'stop', 'mode', 'modes', 'status', 'help', '-h'];
		if (validSubcommands.includes(subcommand.toLowerCase())) {
			switch (subcommand.toLowerCase()) {
				case 'start':
					return startAi(args[1], ctx, aiName, aiCmd);
				case 'stop':
					return stopAi(ctx, aiName);
				case 'mode':
					return changeMode(args[1], ctx, aiCmd);
				case 'modes':
					return listModes(aiName);
				case 'status':
					return showStatus(ctx, aiName);
				case 'help':
				case '-h':
					return showAiHelp(aiName, aiCmd);
				default:
					return showAiHelp(aiName, aiCmd);
			}
		}

		// Si no es un subcomando válido, asumir que es una pregunta directa
		// Activar el modo y devolver señal para procesar la pregunta
		ctx.setAiMode(ctx.aiMode || 'arquitecto');
		return {
			output: '',
			startChatWith: args.join(' ') // Señal especial para el Terminal
		};
	}
};

function showAiHelp(aiName: string, aiCmd: string) {
	const lines = [
		`<span class="ai-header">🤖 ${aiName} - Terminal AI</span>`,
		'',
		`<span class="system-header">Uso:</span> ${aiCmd} &lt;subcomando&gt; [opciones]`,
		'',
		'<span class="system-header">Subcomandos:</span>',
		`  <span class="command-highlight">start [modo]</span>  Inicia sesión AI`,
		`  <span class="command-highlight">stop</span>          Termina sesión AI`,
		`  <span class="command-highlight">mode &lt;modo&gt;</span>   Cambia el modo activo`,
		`  <span class="command-highlight">modes</span>         Lista modos disponibles`,
		`  <span class="command-highlight">status</span>        Muestra estado actual`,
		'',
		'<span class="system-header">Modos disponibles:</span>'
	];

	for (const [key, mode] of Object.entries(AI_MODES)) {
		lines.push(`  <span class="mode-name">${key.padEnd(14)}</span> ${mode.description}`);
	}

	lines.push('');
	lines.push(`<span class="system-hint">Ejemplo: ${aiCmd} start arquitecto</span>`);

	return { output: lines.join('\n'), isHtml: true };
}

function startAi(
	mode: string | undefined,
	ctx: CommandContext,
	aiName: string,
	aiCmd: string
) {
	const selectedMode = mode || 'arquitecto';

	if (!AI_MODES[selectedMode]) {
		return {
			output: `Modo '${selectedMode}' no existe\nUsa '${aiCmd} modes' para ver los disponibles`
		};
	}

	ctx.setAiMode(selectedMode);

	const modeInfo = AI_MODES[selectedMode];
	const lines = [
		`<span class="ai-success">✓ ${aiName} iniciado</span>`,
		'',
		`<span class="system-header">Modo activo:</span> <span class="mode-name">${modeInfo.name}</span>`,
		`<span class="system-header">Descripción:</span> ${modeInfo.description}`,
		'',
		'<span class="ai-prompt">🤖 Escribe tu consulta directamente...</span>',
		`<span class="system-hint">Usa "${aiCmd} stop" o "exit" para terminar</span>`
	];

	return { output: lines.join('\n'), isHtml: true };
}

function stopAi(ctx: CommandContext, aiName: string) {
	if (!ctx.aiMode) {
		return { output: 'No hay sesión activa' };
	}

	ctx.setAiMode(null);
	return {
		output: `<span class="ai-warning">${aiName} desactivado. ¡Chau! 👋</span>`,
		isHtml: true
	};
}

function changeMode(mode: string | undefined, ctx: CommandContext, aiCmd: string) {
	if (!ctx.aiMode) {
		return { output: `Primero inicia una sesión con "${aiCmd} start"` };
	}

	if (!mode) {
		return { output: `Especifica un modo\nUso: ${aiCmd} mode <modo>` };
	}

	if (!AI_MODES[mode]) {
		return { output: `Modo '${mode}' no existe` };
	}

	ctx.setAiMode(mode);

	const modeInfo = AI_MODES[mode];
	let modeMessage = `<span class="ai-success">✓ Modo cambiado a:</span> <span class="mode-name">${mode}</span>`;
	modeMessage += `<br><span class="system-hint">${modeInfo.description}</span>`;

	return { output: modeMessage, isHtml: true };
}

function listModes(aiName: string) {
	const lines = [`<span class="system-header">Modos de ${aiName}:</span>`, ''];

	for (const [key, mode] of Object.entries(AI_MODES)) {
		lines.push(`  <span class="mode-name">${key.padEnd(14)}</span> ${mode.description}`);
	}

	return { output: lines.join('\n'), isHtml: true };
}

function showStatus(ctx: CommandContext, aiName: string) {
	if (!ctx.aiMode) {
		return { output: `<span class="ai-warning">${aiName}: inactivo</span>`, isHtml: true };
	}

	const mode = AI_MODES[ctx.aiMode];
	if (!mode) {
		return { output: `<span class="ai-warning">${aiName}: modo desconocido</span>`, isHtml: true };
	}

	const lines = [
		`<span class="ai-header">Estado de ${aiName}</span>`,
		'',
		`<span class="system-header">Activo:</span> <span class="ai-success">Sí</span>`,
		`<span class="system-header">Modo:</span> <span class="mode-name">${ctx.aiMode}</span>`,
		`<span class="system-header">Descripción:</span> ${mode.description}`
	];

	return { output: lines.join('\n'), isHtml: true };
}