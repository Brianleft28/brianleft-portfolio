import { writable } from 'svelte/store';

/**
 * Controla la visibilidad del panel de la terminal.
 */
export const isTerminalVisible = writable(false);