import { writable } from 'svelte/store';

export const currentPath = writable('C:\\');
export const startInChatMode = writable(false);
export const iaMode = writable<string | null>(null); // null = inactivo, 'asistente', 'arquitecto', etc.

