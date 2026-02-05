import type { Component } from 'svelte';

export type FileType = 'markdown' | 'component';

export type FileNode = {
	id: string;
	name: string;
	type: FileType;
	content?: string;
	component?: Component;
	isActive?: boolean;
};

export type FolderNode = {
	id: string;
	name: string;
	type: 'folder';
	children: FileSystemNode[];
};

export type FileSystemNode = FolderNode | FileNode;

/**
 * Estructura de filesystem estática de fallback (white-label)
 * Los datos reales se cargan desde la API del backend.
 * Esta estructura solo se usa si la API no está disponible.
 */
export const fileSystemData: FolderNode = {
	id: 'root',
	type: 'folder',
	name: 'C:\\',
	children: [
		{
			id: 'proyectos',
			name: 'proyectos',
			type: 'folder',
			children: []
		},
		{
			id: 'apps',
			name: 'apps',
			type: 'folder',
			children: [
				{
					id: 'contacto-app',
					name: 'Contacto.exe',
					type: 'component'
				}
			]
		},
		{
			id: 'welcome',
			name: 'LEEME.md',
			type: 'markdown',
			content: `# Bienvenido a tu Portfolio Interactivo

Este portfolio es interactivo. Podés navegar usando:

- El **Explorador de Archivos** a la izquierda.
- La **Terminal** abajo, abrila con \`CTRL\` + \`Ñ\` (probá comandos como \`cd\` o \`ll\`).

---

## Primeros Pasos

1. **Configuración:** Andá al panel de \`/admin/settings\` para personalizar tu información.
2. **Crear Contenido:** Desde el área de administración, empezá a crear tus proyectos.
3. **Asistente IA:** Una vez que tengas contenido, la IA podrá responder preguntas.

---

## Comandos Útiles

- \`ls\` - Listar archivos y carpetas
- \`cd [carpeta]\` - Navegar a una carpeta
- \`cat [archivo]\` - Leer contenido de un archivo
- \`help\` - Ver todos los comandos disponibles
- \`register -h\` - Ver cómo registrarte
- \`whoami\` - Ver tu información de usuario

Para ver todos los comandos, ejecutá \`cat COMANDOS.md\` o abrí el archivo desde el explorador.

---

*Empezá registrándote con el comando \`register\` en la terminal.*`
		},
		{
			id: 'comandos',
			name: 'COMANDOS.md',
			type: 'markdown',
			content: `# COMANDOS DE TERMINAL

## Navegación
- \`ls\` o \`ll\` - Listar archivos
- \`cd [carpeta]\` - Cambiar directorio
- \`pwd\` - Directorio actual

## Autenticación
- \`register --username [user] --email [email] --password [pass]\` - Registrar
- \`verify [código]\` - Verificar email (el prompt cambia a codigo:\\>)
- \`login\` - Abrir panel de login o iniciar sesión
- \`logout\` - Cerrar sesión
- \`whoami\` - Ver info del usuario actual

## Asistente IA
- \`ai\` - Iniciar asistente
- \`ai [pregunta]\` - Pregunta directa
- \`ai modes\` - Ver modos disponibles
- \`ai mode arquitecto\` - Cambiar a modo técnico

## Sistema
- \`cls\` o \`clear\` - Limpiar terminal
- \`help\` - Ver ayuda
- \`admin\` - Panel de administración`
		}
	]
};
