<script lang="ts">
	import { onMount } from 'svelte';

	// Tipos locales para evitar hot-reload
	type FileSystemNode = {
		id: string;
		name: string;
		type: 'folder' | 'markdown' | 'text' | 'code';
		children?: FileSystemNode[];
	};

	let title = $state('');
	let content = $state('');
	let readmeContent = $state('');
	
	// Ubicación en el FS
	let selectedPath = $state<string[]>(['proyectos']);
	let createNewFolder = $state(false);
	let newFolderName = $state('');
	
	let loading = $state(false);
	let result = $state<{ 
		success?: boolean; 
		error?: string; 
		message?: string; 
		details?: {
			projectFile: string;
			memoryUpdated: boolean;
			fileSystemUpdated: boolean;
			aiSummary?: string;
		}
	} | null>(null);
	let fileInput: HTMLInputElement;

	// Carpetas cargadas una sola vez (evita hot-reload)
	let availableFolders = $state<{ path: string[]; label: string; depth: number }[]>([]);

	// Obtener carpetas disponibles del FS (recursivo)
	function getFolders(node: FileSystemNode, path: string[] = []): { path: string[]; label: string; depth: number }[] {
		const folders: { path: string[]; label: string; depth: number }[] = [];
		
		if (node.type === 'folder') {
			const currentPath = [...path, node.id];
			folders.push({ 
				path: currentPath, 
				label: node.name,
				depth: path.length
			});
			
			if (node.children) {
				for (const child of node.children) {
					if (child.type === 'folder') {
						folders.push(...getFolders(child, currentPath));
					}
				}
			}
		}
		
		return folders;
	}

	// Cargar carpetas una sola vez al montar
	onMount(async () => {
		const { fileSystemData } = await import('$lib/data/file-system');
		availableFolders = getFolders(fileSystemData as FileSystemNode);
	});

	const generatedId = $derived(
		title ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : ''
	);

	const finalPath = $derived(
		createNewFolder && newFolderName 
			? [...selectedPath, newFolderName.toLowerCase().replace(/\s+/g, '-')]
			: selectedPath
	);

	const pathDisplay = $derived(finalPath.join(' / '));

	function handleFileLoad(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (file) {
			if (!file.name.endsWith('.md') && !file.name.endsWith('.markdown') && !file.name.endsWith('.txt')) {
				result = { error: 'Solo se permiten archivos .md, .markdown o .txt' };
				return;
			}

			const reader = new FileReader();
			reader.onload = (e) => {
				content = e.target?.result as string;
				
				if (!title) {
					const titleMatch = content.match(/^#\s+(.+)$/m);
					if (titleMatch) {
						title = titleMatch[1];
					}
				}
				
				if (!readmeContent) {
					readmeContent = content.slice(0, 800);
				}
			};
			reader.readAsText(file);
		}
	}

	async function handleSubmit() {
		if (!title || !content) {
			result = { error: 'Completa título y contenido' };
			return;
		}

		if (createNewFolder && !newFolderName) {
			result = { error: 'Ingresa el nombre de la nueva carpeta' };
			return;
		}

		loading = true;
		result = null;

		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: generatedId,
					title,
					filename: `${generatedId}.md`,
					content,
					targetPath: finalPath,
					createFolder: createNewFolder,
					newFolderName: createNewFolder ? newFolderName : null,
					fsEntry: {
						folderName: createNewFolder ? newFolderName.toLowerCase().replace(/\s+/g, '-') : null,
						readmeName: 'README.md',
						readmeContent: readmeContent || content.slice(0, 500)
					}
				})
			});

			result = await response.json();
		} catch (error) {
			result = { error: 'Error de conexión' };
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		title = '';
		content = '';
		readmeContent = '';
		newFolderName = '';
		createNewFolder = false;
		selectedPath = ['proyectos'];
		result = null;
		if (fileInput) fileInput.value = '';
	}

	function selectFolder(path: string[]) {
		selectedPath = path;
	}
</script>

<div class="p-3">
	<!-- Header -->
	<div class="border-bottom border-secondary pb-3 mb-4">
		<h2 class="text-light mb-1">📁 Cargar Proyecto (.md)</h2>
		<p class="text-secondary mb-0 small">Agrega archivos Markdown a la memoria y al sistema de archivos virtual</p>
	</div>

	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<!-- Ubicación en el FS -->
		<div class="card bg-dark border-secondary mb-3">
			<div class="card-header border-secondary">📍 Ubicación en el explorador</div>
			<div class="card-body">
				<div 
					class="border border-secondary rounded p-2 mb-3"
					style="background: #1a1a1a; max-height: 180px; overflow-y: scroll; display: block;"
				>
					{#each availableFolders as folder}
						<button
							type="button"
							class="folder-item d-block w-100 text-start border-0 rounded px-2 py-1 mb-1"
							class:selected={JSON.stringify(selectedPath) === JSON.stringify(folder.path)}
							style="padding-left: {folder.depth * 1.2 + 0.5}rem !important;"
							onclick={() => selectFolder(folder.path)}
						>
							<span class="me-2">{folder.depth === 0 ? '💻' : '📁'}</span>
							<span class="text-light">{folder.label}</span>
						</button>
					{/each}
				</div>

				<div class="form-check mb-3">
					<input class="form-check-input" type="checkbox" id="createFolder" bind:checked={createNewFolder} />
					<label class="form-check-label text-light" for="createFolder">
						Crear nueva carpeta dentro de "<span class="text-info">{selectedPath[selectedPath.length - 1]}</span>"
					</label>
				</div>

				{#if createNewFolder}
					<div class="mb-3">
						<input
							type="text"
							bind:value={newFolderName}
							placeholder="mi-nuevo-proyecto"
							class="form-control bg-dark text-light border-secondary"
						/>
					</div>
				{/if}

				<div class="alert alert-info py-2 mb-0 small">
					<strong>Guardará en:</strong> <code class="text-white">C:\{pathDisplay}\README.md</code>
				</div>
			</div>
		</div>

		<!-- Contenido -->
		<div class="card bg-dark border-secondary mb-3">
			<div class="card-header border-secondary">📄 Contenido</div>
			<div class="card-body">
				<div class="mb-3">
					<label for="file-input" class="form-label text-light small">Cargar archivo Markdown</label>
					<input
						bind:this={fileInput}
						type="file"
						id="file-input"
						accept=".md,.markdown,.txt"
						onchange={handleFileLoad}
						class="form-control bg-dark text-light border-secondary"
					/>
					<div class="form-text">Formatos: .md, .markdown, .txt</div>
				</div>

				<div class="mb-3">
					<label for="title" class="form-label text-light small">Título del proyecto *</label>
					<input
						type="text"
						id="title"
						bind:value={title}
						placeholder="Sistema de Gestión Electoral"
						class="form-control bg-dark text-light border-secondary"
						required
					/>
					{#if generatedId}
						<div class="form-text">ID generado: <code class="text-info">{generatedId}</code></div>
					{/if}
				</div>

				<div class="mb-3">
					<label for="content" class="form-label text-light small">Contenido Markdown *</label>
					<textarea
						id="content"
						bind:value={content}
						placeholder="# Mi Proyecto&#10;&#10;Descripción del proyecto..."
						class="form-control bg-dark text-light border-secondary font-monospace"
						rows="10"
						required
					></textarea>
				</div>

				<details>
					<summary class="text-info small mb-2" style="cursor: pointer;">⚙️ Opciones avanzadas</summary>
					<div class="mt-2">
						<label for="readme-content" class="form-label text-light small">Resumen para el explorador (opcional)</label>
						<textarea
							id="readme-content"
							bind:value={readmeContent}
							placeholder="Versión resumida que aparece en el explorador de archivos..."
							class="form-control bg-dark text-light border-secondary"
							rows="4"
						></textarea>
						<div class="form-text">Si está vacío, se usan los primeros 500 caracteres</div>
					</div>
				</details>
			</div>
		</div>

		<!-- Acciones -->
		<div class="d-flex gap-2 mb-3">
			<button type="submit" class="btn btn-primary" disabled={loading}>
				{#if loading}
					<span class="spinner-border spinner-border-sm me-2"></span>
					Guardando...
				{:else}
					💾 Guardar en memoria + FS
				{/if}
			</button>
			<button type="button" class="btn btn-outline-secondary" onclick={resetForm}>
				🔄 Limpiar
			</button>
		</div>
	</form>

	<!-- Resultado -->
	{#if result}
		{#if result.success}
			<div class="alert alert-success">
				<h5 class="alert-heading">✅ {result.message}</h5>
				{#if result.details}
					<ul class="mb-0 mt-2">
						<li>📝 Archivo MD: <code>{result.details.projectFile}</code></li>
						<li>
							{result.details.memoryUpdated ? '✅' : '⚠️'} memory.md: 
							{result.details.memoryUpdated ? 'Actualizado' : 'No se pudo actualizar'}
						</li>
						<li>
							{result.details.fileSystemUpdated ? '✅' : '⚠️'} file-system.ts: 
							{result.details.fileSystemUpdated ? 'Modificado automáticamente' : 'No se pudo modificar'}
						</li>
					</ul>
					{#if result.details.aiSummary}
						<hr />
						<div class="bg-dark rounded p-2 mt-2">
							<small class="text-info">🤖 Resumen generado por IA:</small>
							<p class="mb-0 mt-1 small text-light">{result.details.aiSummary}</p>
						</div>
					{/if}
					{#if result.details.memoryUpdated && result.details.fileSystemUpdated}
						<hr />
						<p class="mb-0 small text-success-emphasis">
							🎉 <strong>¡Listo!</strong> El proyecto ya está disponible en el explorador y en la memoria de la IA. 
							Reinicia el servidor de desarrollo para ver los cambios.
						</p>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="alert alert-danger">
				<h5 class="alert-heading">❌ Error</h5>
				<p class="mb-0">{result.error}</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.folder-item {
		background: transparent;
		color: #adb5bd;
		transition: background 0.15s;
		font-family: 'Courier New', monospace;
	}

	.folder-item:hover {
		background: rgba(0, 255, 0, 0.05);
		color: #00ff00;
	}

	.folder-item.selected {
		background: rgba(0, 255, 0, 0.15);
		outline: 1px solid #00ff00;
		color: #00ff00;
    }

	:global(.projects-page .card) {
		background: #0d0d1a !important;
		border-color: #333 !important;
	}

	:global(.projects-page .card-header) {
		background: #161622 !important;
		border-color: #333 !important;
		color: #00ff00 !important;
		font-family: 'Courier New', monospace !important;
	}

	:global(.projects-page .btn-primary) {
		background: #00ff00 !important;
		border-color: #00ff00 !important;
		color: #0d0d1a !important;
		font-family: 'Courier New', monospace !important;
	}

	:global(.projects-page .btn-primary:hover) {
		background: #00cc00 !important;
		border-color: #00cc00 !important;
	}

	:global(.projects-page .btn-outline-secondary) {
		border-color: #00ff00 !important;
		color: #00ff00 !important;
		font-family: 'Courier New', monospace !important;
	}

	:global(.projects-page .btn-outline-secondary:hover) {
		background: rgba(0, 255, 0, 0.1) !important;
		color: #00ff00 !important;
	}

	:global(.projects-page .form-control) {
		background: #161622 !important;
		border-color: #333 !important;
		font-family: 'Courier New', monospace !important;
	}

	:global(.projects-page .form-control:focus) {
		border-color: #00ff00 !important;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.15) !important;
	}

	:global(.projects-page .alert-info) {
		background: rgba(0, 255, 0, 0.05) !important;
		border-color: #00ff00 !important;
		color: #00ff00 !important;
	}

	:global(.projects-page .text-info) {
		color: #00ff00 !important;
	}
</style>
