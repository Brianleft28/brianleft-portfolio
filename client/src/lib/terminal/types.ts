import type { FileSystemNode } from '$lib/data/file-system';

export interface CommandContext {
	currentPath: string;
	setPath: (path: string) => void;
	getNodeAtPath: (path: string) => FileSystemNode | undefined;
	aiMode: string | null;
	setAiMode: (mode: string | null) => void;
	// Configuración dinámica de IA
	aiCommandName?: string;
	aiDisplayName?: string;
	ownerName?: string;
	// Autenticación
	isAuthenticated?: boolean;
	/**
	 * Pide un dato por teclado sin que el comando quede escrito en la línea.
	 * Con `masked: true` el input es de tipo password y en el historial sólo
	 * quedan puntos, nunca el valor: la contraseña no toca localStorage.
	 * Resuelve `null` si el usuario cancela con Escape.
	 */
	ask?: (label: string, options?: { masked?: boolean }) => Promise<string | null>;
}

export interface CommandResult {
    output: string;
    isHtml?: boolean;
    isMarkdown?: boolean;
    clear?: boolean;
    startChatWith?: string; // Señal para iniciar chat con un prompt inicial
}

export interface Command {
    name: string;
    description: string;
    usage?: string;
    requiresAuth?: boolean; // Si true, solo disponible para usuarios logueados
    execute: (args: string[], ctx: CommandContext) => CommandResult | Promise<CommandResult>;
}

export interface HistoryEntry {
    command: string;
    output: string;
    isHtml?: boolean;
    isMarkdown?: boolean;
    isAiResponse?: boolean;
}

export interface AiMode {
    name: string;
    description: string;
    systemPrompt: string;
}