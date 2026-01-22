// Terminal Module - API Pública
export type { Command, CommandContext, CommandResult, HistoryEntry, AiMode } from './types';
export { getCommand, getAllCommands, generateHelp } from './commands';
export { apikey, cat, cd, cls, cv, help, ls, pwd, register, tree, torvalds } from './commands';
export { getAiModes, setAiModes, DEFAULT_AI_MODES } from './commands/torvalds';
export { theme, initializeTheme, availableThemes } from './commands/theme';