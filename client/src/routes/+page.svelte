<script lang="ts">
	import folderMainIcon from '$lib/assets/folder_main.png';
	import folderIcon from '$lib/assets/folder.png';
	import markdownIcon from '$lib/assets/markdown.svg';
	import FileViewer from '$lib/components/FileViewer.svelte';
	import type { FolderNode, FileSystemNode, FileNode } from '$lib/data/file-system';
	import { fileSystemData as staticFileSystem } from '$lib/data/file-system';
	import { dynamicFilesystem, loadConfig, type FileSystemNode as DynamicFSNode } from '$lib/stores/config';
	import { onMount } from 'svelte';

	// Tipos para resúmenes de proyectos
	interface ProjectSummary {
		slug: string;
		title: string;
		summary: string;
	}

	let currentPathIds = $state<string[]>([]);
	let activeFileId = $state<string | null>(null);
	let dynamicFs = $state<DynamicFSNode[]>([]);
	let initialLoadDone = $state(false);
	let isSelectingReadme = $state(false);
	let projectSummaries = $state<ProjectSummary[]>([]);

	// Cargar configuración y filesystem al montar
	onMount(() => {
		loadConfig();
		loadProjectSummaries();
		
		// Suscribirse al store dinámico
		const unsubscribe = dynamicFilesystem.subscribe((value) => {
			dynamicFs = value;
			// Cuando se carga el filesystem por primera vez, auto-seleccionar LEEME.md
			if (value && value.length > 0 && !initialLoadDone) {
				initialLoadDone = true;
				// Esperar un poco más para evitar parpadeo durante el render inicial
				setTimeout(() => {
					const root = fileSystemData();
					if (root && root.children && !activeFileId) {
						autoSelectReadme(root);
					}
				}, 100);
			}
		});
		
		return unsubscribe;
	});

	// Cargar resúmenes de proyectos desde la API
	async function loadProjectSummaries() {
		try {
			const res = await fetch('/api/memories/summaries');
			if (res.ok) {
				projectSummaries = await res.json();
			}
		} catch (e) {
			console.error('Error loading project summaries:', e);
		}
	}

	// Transform dynamic filesystem to match static types
	function transformDynamicNode(node: DynamicFSNode): FileSystemNode {
		if (node.type === 'folder') {
			return {
				id: String(node.id),
				name: node.name,
				type: 'folder',
				children: (node.children || []).map(transformDynamicNode)
			} as FolderNode;
		}
		return {
			id: String(node.id),
			name: node.name,
			type: node.fileType === 'markdown' ? 'markdown' : 'markdown',
			content: node.content || ''
		} as FileNode;
	}

	// Use dynamic filesystem if available, fallback to static
	// El API devuelve [{id:1, name:"C:", children:[...]}] - tomamos el primero como raíz
	let fileSystemData = $derived(() => {
		if (dynamicFs && dynamicFs.length > 0) {
			// El primer elemento ES la carpeta raíz C:
			const rootFolder = dynamicFs[0];
			return {
				id: 'root',
				name: rootFolder.name || 'C:\\',
				type: 'folder',
				children: (rootFolder.children || []).map(transformDynamicNode)
			} as FolderNode;
		}
		return staticFileSystem;
	});

	let currentDirectory = $derived(() => {
		let current: FolderNode = fileSystemData();
		for (const id of currentPathIds) {
			const nextNode = current.children?.find((child) => child.id === id);
			if (nextNode && nextNode.type === 'folder') {
				current = nextNode;
			}
		}
		return current;
	});

	let currentDirectoryItems = $derived(() => currentDirectory().children || []);

	let activeItem = $derived(() => {
		function findFileById(node: FileSystemNode, id: string | null): FileNode | undefined {
			if (!id) return undefined;
			if (node.type !== 'folder') {
				return node.id === id ? node : undefined;
			}
			for (const child of node.children) {
				const found = findFileById(child, id);
				if (found) return found;
			}
		}
		return findFileById(fileSystemData(), activeFileId);
	});

	// Obtener el resumen del proyecto actual (si estamos en una carpeta de proyecto)
	let currentProjectSummary = $derived(() => {
		const dir = currentDirectory();
		if (!dir || dir.name === 'C:' || dir.name === 'C:\\') return null;
		
		// Buscar por nombre de carpeta (slug)
		const folderName = dir.name.toLowerCase().replace(/\s+/g, '-');
		const summary = projectSummaries.find(s => 
			s.slug.toLowerCase() === folderName || 
			s.title.toLowerCase() === dir.name.toLowerCase()
		);
		return summary || null;
	});

	// Construir el path con nombres de carpetas, no IDs
	let currentPathString = $derived(() => {
		let pathNames: string[] = [];
		let current: FolderNode = fileSystemData();
		for (const id of currentPathIds) {
			const nextNode = current.children?.find((child) => child.id === id);
			if (nextNode && nextNode.type === 'folder') {
				pathNames.push(nextNode.name);
				current = nextNode;
			}
		}
		const fileName = activeItem()?.name || '';
		return `C:\\${pathNames.join('\\')}${pathNames.length > 0 ? '\\' : ''}${fileName}`;
	});

	function handleItemClick(clickedItem: FileSystemNode) {
		if (clickedItem.type === 'folder') {
			currentPathIds = [...currentPathIds, clickedItem.id];
			// Al entrar a una carpeta, buscar y seleccionar LEEME.md o README.md
			autoSelectReadme(clickedItem as FolderNode);
		} else {
			activeFileId = clickedItem.id;
		}
	}

	// Auto-seleccionar README/LEEME.md al entrar a una carpeta
	function autoSelectReadme(folder: FolderNode) {
		if (isSelectingReadme) return; // Evitar llamadas múltiples
		
		if (!folder.children) {
			activeFileId = null;
			return;
		}
		
		isSelectingReadme = true;
		const readmeNames = ['leeme.md', 'readme.md', 'leeme', 'readme'];
		const readmeFile = folder.children.find((child) => 
			child.type !== 'folder' && 
			readmeNames.includes(child.name.toLowerCase())
		);
		
		if (readmeFile) {
			activeFileId = readmeFile.id;
		} else {
			activeFileId = null;
		}
		
		// Reset flag después de un breve delay
		setTimeout(() => {
			isSelectingReadme = false;
		}, 50);
	}

	function navigateUp() {
		if (currentPathIds.length > 0) {
			currentPathIds.pop();
			currentPathIds = [...currentPathIds];
			// Al subir, buscar README en la carpeta padre
			const parentDir = currentDirectory();
			autoSelectReadme(parentDir);
		}
	}

	function goToRoot() {
		currentPathIds = [];
		activeFileId = 'welcome';
	}
</script>

<div class="container-fluid py-2 font-monospace d-flex flex-column" style="height: 100%; overflow: hidden;">
    <!-- Indice -->
    <header class="row flex-shrink-0">
        <h3 class="col-12 mb-3">Índice de {currentPathString()}</h3>
        <hr />
    </header>

	<div class="row flex-grow-1 overflow-hidden" style="min-height: 0;">
		<!-- Izquierda -->
		<div class="col-md-5 pe-md-4 h-100 overflow-auto">
			{#if currentPathIds.length > 0}
				<div class="d-flex align-items-center mb-2">
					<img src={folderIcon} alt="folder icon" width="18" height="18" class="me-2" />
					<button class="btn btn-link text-decoration-none p-0" onclick={navigateUp}
						>..</button
					>
				</div>
				<div class="d-flex align-items-center mb-2">
					<img
						src={folderMainIcon}
						alt="folder icon"
						width="18"
						height="18"
						class="me-2"
					/>
					<button class="btn btn-link text-decoration-none p-0" onclick={goToRoot}
						>[directorio principal]</button
					>
				</div>
			{/if}
			<div>
				{#each currentDirectoryItems() as item (item.id)}
					<div class="d-flex align-items-center mb-2">
						<img
							src={item.type === 'folder' ? folderIcon : markdownIcon}
							alt="{item.type} icon"
							width="18"
							height="18"
							class="me-2"
						/>
						<button
							class:active={item.id === activeFileId}
							class="btn btn-link text-decoration-none p-0"
							onclick={() => handleItemClick(item)}
						>
							{item.name}
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Derecha -->
		<div class="col-md-7 h-100 d-flex flex-column" style="min-height: 0; overflow: hidden;">
			<div
				class="card card-dark-viewer shadow-sm border-0 h-100 d-flex flex-column"
				style="overflow: hidden;"
			>
				<div
					class="card-header d-flex justify-content-between align-items-center py-1 flex-shrink-0"
					style="font-size: 0.8rem;"
				>
					<span class="text-light"
						>{activeItem()?.name || 'Sin archivo seleccionado'}</span
					>
					{#if activeItem()}
						<button
							class="btn-close-neon"
							onclick={() => (activeFileId = null)}
							aria-label="Cerrar archivo"
						>
							✕
						</button>
					{/if}
				</div>

				<div
					class="card-body p-0 flex-grow-1 overflow-auto"
					style="background: #222;"
				>
					{#if activeItem()}
						<FileViewer file={activeItem()!} />
					{:else if currentProjectSummary()}
						<!-- Mostrar resumen del proyecto -->
						<div class="project-summary p-4">
							<h2 class="summary-title">{currentProjectSummary()!.title}</h2>
							<div class="summary-content">
								<p>{currentProjectSummary()!.summary}</p>
							</div>
							<div class="summary-hint mt-3">
								<small class="text-muted">
									Seleccioná un archivo del panel izquierdo para ver más detalles.
								</small>
							</div>
						</div>
					{:else}
						<div
							class="empty-state h-100 d-flex flex-column justify-content-center align-items-center"
						>
							<img src={folderMainIcon} alt="Logo" width="64" />
							<p class="mt-3 text-muted">Seleccioná un archivo para comenzar...</p>
							<small class="text-muted"
								>Usá <kbd>Ctrl</kbd> + <kbd>Ñ</kbd> para abrir la consola.</small
							>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
<style>
    /* Estilos para resumen de proyecto */
    .project-summary {
        color: #adb5bd;
        line-height: 1.7;
    }

    .summary-title {
        color: #00bc8c;
        font-size: 1.4rem;
        font-weight: 600;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #333;
    }

    .summary-content {
        color: #e0e0e0;
        font-size: 0.95rem;
        line-height: 1.8;
    }

    .summary-content p {
        margin-bottom: 0;
        white-space: pre-wrap;
    }

    .summary-hint {
        border-top: 1px solid #333;
        padding-top: 1rem;
    }

    /* Scrollbar estilo neon para columna izquierda */
    .col-md-5::-webkit-scrollbar {
        width: 4px;
    }

    .col-md-5::-webkit-scrollbar-track {
        background: #0d0d0d;
        border-radius: 2px;
    }

    .col-md-5::-webkit-scrollbar-thumb {
        background: #00bc8c;
        border-radius: 2px;
        box-shadow: 0 0 6px rgba(0, 188, 140, 0.5);
    }

    .col-md-5::-webkit-scrollbar-thumb:hover {
        background: #00ff9f;
        box-shadow: 0 0 10px rgba(0, 255, 159, 0.8);
    }

    /* Scrollbar estilo neon para card-body (visor derecho) */
    .card-body::-webkit-scrollbar {
        width: 4px;
    }

    .card-body::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 2px;
    }

    .card-body::-webkit-scrollbar-thumb {
        background: #00bc8c;
        border-radius: 2px;
        box-shadow: 0 0 8px rgba(0, 188, 140, 0.6);
    }

    .card-body::-webkit-scrollbar-thumb:hover {
        background: #00ff9f;
        box-shadow: 0 0 12px rgba(0, 255, 159, 0.9);
    }
</style>