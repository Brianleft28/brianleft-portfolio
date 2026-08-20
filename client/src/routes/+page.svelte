<script lang="ts">
	import folderMainIcon from '$lib/assets/folder_main.png';
	import folderIcon from '$lib/assets/folder.png';
	import markdownIcon from '$lib/assets/markdown.svg';
	import FileViewer from '$lib/components/FileViewer.svelte';
	import type { FolderNode, FileSystemNode, FileNode } from '$lib/data/file-system';
	import { loadConfig } from '$lib/stores/config';
	import { fileTree } from '$lib/stores/filesystem';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';

	// Tipos para resúmenes de proyectos
	interface ProjectSummary {
		slug: string;
		title: string;
		summary: string;
	}

	/** Nombres que valen como portada de una carpeta, en los dos idiomas. */
	const COVER_NAMES = ['leeme.md', 'readme.md', 'leeme', 'readme'];

	function findCoverId(folder: FolderNode | undefined): string | null {
		const cover = folder?.children?.find(
			(child) => child.type !== 'folder' && COVER_NAMES.includes(child.name.toLowerCase())
		);
		return cover?.id ?? null;
	}

	let currentPathIds = $state<string[]>([]);

	// Arranca resuelto y no en `null`: el `$effect` que elige la portada no corre
	// durante el render del servidor, así que el HTML salía sin ningún archivo
	// abierto — es decir, sin contenido para un crawler.
	let activeFileId = $state<string | null>(findCoverId($fileTree));
	let isSelectingReadme = $state(false);
	let projectSummaries = $state<ProjectSummary[]>([]);

	// Cargar configuración y filesystem al montar
	onMount(() => {
		loadConfig();
		loadProjectSummaries();
	});

	/**
	 * Monta la portada (LEEME.md) al abrir, sin que haya que seleccionarla.
	 *
	 * Se dispara por la *forma* del árbol, no por un timeout: antes se elegía a
	 * los 50ms contra el filesystem estático y, cuando llegaba el real por red,
	 * ya había un `activeFileId` — de otro árbol — así que no se reintentaba y
	 * no se mostraba nada. Al cambiar el árbol se vuelve a elegir.
	 *
	 * La firma evita reabrir el archivo si el visitante lo cerró con la ✕.
	 */
	let autoSelectedSignature = $state<string | null>(null);

	$effect(() => {
		const root = fileSystemData();
		if (!root?.children?.length) return;

		const signature = root.children.map((child) => child.id).join(',');
		if (autoSelectedSignature === signature) return;

		autoSelectedSignature = signature;
		autoSelectReadme(root);
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

	// El árbol viene del store compartido con la terminal (`$lib/stores/filesystem`),
	// para que explorador y terminal no puedan volver a mostrar cosas distintas.
	let fileSystemData = $derived(() => $fileTree);

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
		// En la raíz no hay proyecto que resumir
		if (!dir || currentPathIds.length === 0) return null;
		
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
		// Mismo formato que el prompt de la terminal: `~` y separadores Unix
		return ['~', ...pathNames, fileName].filter(Boolean).join('/');
	});

	// Si el ítem es una carpeta de proyecto (estamos dentro de `proyectos/`),
	// devuelve su slug para linkear a la página crawleable /proyectos/[slug].
	// Devuelve null para el resto (archivos, otras carpetas): esos siguen siendo
	// navegación in-page pura.
	function projectSlugFor(item: FileSystemNode): string | null {
		if (item.type !== 'folder') return null;
		if (currentDirectory().name.toLowerCase() !== 'proyectos') return null;
		return item.name.toLowerCase().replace(/\s+/g, '-');
	}

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
		activeFileId = findCoverId(folder);
		
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

<div class="container-fluid py-2 font-monospace d-flex flex-column" style="height: 100vh; overflow: hidden;">
    <!-- Indice -->
    <header class="row flex-shrink-0">
        <div class="col-12 mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <h3 class="mb-0">{$_('page.home.index_of')} {currentPathString()}</h3>
            <!-- Descarga directa del CV para el visitante que no abre la terminal.
                 Reusa el endpoint del comando `cv`. `download` fuerza la bajada. -->
            <a
                href="/api/uploads/cv?lang={$locale === 'en' ? 'en' : 'es'}"
                download
                class="btn btn-sm btn-outline-success"
            >
                ⬇ {$_('page.home.download_cv')}
            </a>
        </div>
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
						>{$_('page.home.main_directory')}</button
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
						{#if projectSlugFor(item)}
							<!-- Link real para el crawler y para "abrir en pestaña nueva";
							     el click normal se queda en la navegación SPA. -->
							<a
								href="/proyectos/{projectSlugFor(item)}"
								class:active={item.id === activeFileId}
								class="btn btn-link text-decoration-none p-0"
								onclick={(e) => {
									e.preventDefault();
									handleItemClick(item);
								}}
							>
								{item.name}
							</a>
						{:else}
							<button
								class:active={item.id === activeFileId}
								class="btn btn-link text-decoration-none p-0"
								onclick={() => handleItemClick(item)}
							>
								{item.name}
							</button>
						{/if}
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
						>{activeItem()?.name || $_('page.home.no_file_selected')}</span
					>
					{#if activeItem()}
						<button
							class="btn-close-neon"
							onclick={() => (activeFileId = null)}
							aria-label={$_('page.home.close_file')}
						>
							✕
						</button>
					{/if}
				</div>

				<div
					class="card-body p-0 flex-grow-1 overflow-auto"
					style="background: transparent;"
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
									{$_('page.home.select_file_details')}
								</small>
							</div>
						</div>
					{:else}
						<div
							class="empty-state h-100 d-flex flex-column justify-content-center align-items-center"
						>
							<img src={folderMainIcon} alt="Logo" width="64" />
							<p class="mt-3 text-muted">{$_('page.home.select_file_start')}</p>
							<small class="text-muted"
								>{$_('page.home.use_shortcut')} <kbd>Ctrl</kbd> + <kbd>K</kbd> {$_('page.home.to_open_console')}</small
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
        color: var(--theme-text-primary);
        line-height: 1.7;
    }

    .summary-title {
        color: var(--theme-accent);
        font-size: 1.4rem;
        font-weight: 600;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--theme-border);
    }

    .summary-content {
        color: var(--theme-text-primary);
        font-size: 0.95rem;
        line-height: 1.8;
    }

    .summary-content p {
        margin-bottom: 0;
        white-space: pre-wrap;
    }

    .summary-hint {
        border-top: 1px solid var(--theme-border);
        padding-top: 1rem;
    }

    /* Scrollbar estilo neon para columna izquierda */
    .col-md-5::-webkit-scrollbar {
        width: 4px;
    }

    .col-md-5::-webkit-scrollbar-track {
        background: var(--theme-bg-tertiary);
        border-radius: 2px;
    }

    .col-md-5::-webkit-scrollbar-thumb {
        background: var(--theme-accent);
        border-radius: 2px;
        box-shadow: 0 0 6px var(--theme-accent-glow);
    }

    .col-md-5::-webkit-scrollbar-thumb:hover {
        background: var(--theme-secondary);
        box-shadow: 0 0 10px var(--theme-secondary-glow);
    }

    /* Scrollbar estilo neon para card-body (visor derecho) */
    .card-body::-webkit-scrollbar {
        width: 4px;
    }

    .card-body::-webkit-scrollbar-track {
        background: var(--theme-bg-tertiary);
        border-radius: 2px;
    }

    .card-body::-webkit-scrollbar-thumb {
        background: var(--theme-accent);
        border-radius: 2px;
        box-shadow: 0 0 8px var(--theme-accent-glow);
    }

    .card-body::-webkit-scrollbar-thumb:hover {
        background: var(--theme-secondary);
        box-shadow: 0 0 12px var(--theme-secondary-glow);
    }
</style>