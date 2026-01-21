import type { FileSystemNode } from '$lib/data/file-system';

export interface CommandContext {
    currentPath: string;
    setPath: (path: string) => void;
    getNodeAtPath: (path: string) => FileSystemNode | undefined;
    aiMode: string | null;
    setAiMode: (mode: string | null) => void;
}

export interface CommandResult {
    output: string;
    isHtml?: boolean;
    isMarkdown?: boolean;
    clear?: boolean;
}

export interface Command {
    name: string;
    description: string;
    usage?: string;
    execute: (args: string[], ctx: CommandContext) => CommandResult;
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