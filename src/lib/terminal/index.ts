// Terminal Module - API Pública
export type { Command, CommandContext, CommandResult, HistoryEntry, AiMode } from './types';
export { getCommand, getAllCommands, generateHelp } from './commands';
export { cat, cd, cls, help, ls, pwd, tree, torvalds } from './commands';
export { AI_MODES } from './commands/torvalds';