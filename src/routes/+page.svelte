<script lang="ts">
	import folderMainIcon from '$lib/assets/folder_main.png';
	import folderIcon from '$lib/assets/folder.png';
	import markdownIcon from '$lib/assets/markdown.svg';
	import FileViewer from '$lib/components/FileViewer.svelte';
	import type { FolderNode, FileSystemNode, FileNode } from '$lib/data/file-system';
	import { fileSystemData } from '$lib/data/file-system';

	let currentPathIds = $state<string[]>([]);

	let activeFileId = $state<string | null>('welcome');

	let currentDirectory = $derived(() => {
		let current: FolderNode = fileSystemData;
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
		return findFileById(fileSystemData, activeFileId);
	});

	let currentPathString = $derived(
		() => `C:\\${currentPathIds.join('\\')}\\${activeItem()?.name || ''}`
	);

	function handleItemClick(clickedItem: FileSystemNode) {
		if (clickedItem.type === 'folder') {
			currentPathIds = [...currentPathIds, clickedItem.id];
			activeFileId = null;
		} else {
			activeFileId = clickedItem.id;
		}
	}

	function navigateUp() {
		if (currentPathIds.length > 0) {
			currentPathIds.pop();
			activeFileId = null;
			currentPathIds = [...currentPathIds];
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