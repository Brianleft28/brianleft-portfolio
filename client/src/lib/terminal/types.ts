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