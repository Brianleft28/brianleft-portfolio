import { writable } from 'svelte/store';

// El valor inicial es el directorio raíz 'C:\'
export const currentPath = writable('C:\\');