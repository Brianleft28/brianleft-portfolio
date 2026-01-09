import { writable } from 'svelte/store';

export const currentPath = writable('C:\\');
export const startInChatMode = writable(false);
export const iaMode = writable('arquitecto'); // 'arquitecto', 'debugger', 'documentador'

