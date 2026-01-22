<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Estados locales
	let activeTab = $state<'projects' | 'filesystem' | 'create'>('projects');
	let expandedFolders = $state<Set<number>>(new Set());
	let confirmDelete = $state<{ type: 'folder' | 'file'; id: number; name: string } | null>(null);
	
	// Form de nuevo proyecto
	let newProject = $state({
		name: '',
		slug: '',
		content: '',
		keywords: '',
		folderId: ''
	});
	
	// Form de nueva carpeta
	let newFolder = $state({
		name: '',
		parentId: ''
	});

	// Generar slug automático
	const generatedSlug = $derived(
		newProject.name ? newProject.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : ''
	);

	// Sincronizar slug
	$effect(() => {
		if (!newProject.slug && generatedSlug) {
			newProject.slug = generatedSlug;
		}
	});

	function toggleFolder(id: number) {
		if (expandedFolders.has(id)) {
			expandedFolders.delete(id);
		} else {
			expandedFolders.add(id);
		}
		expandedFolders = new Set(expandedFolders);
	}

	function resetForm() {
		newProject = { name: '', slug: '', content: '', keywords: '', folderId: '' };
		newFolder = { name: '', parentId: '' };
	}

	// Función recursiva para renderizar filesystem
	function countItems(node: any): { folders: number; files: number } {
		let folders = 0;
		let files = 0;
		
		if (node.children) {
			for (const child of node.children) {
				if (child.type === 'folder') {
					folders++;
					const sub = countItems(child);
					folders += sub.folders;
					files += sub.files;
				} else {
					files++;
				}
			}
		}
		
		return { folders, files };
	}
</script>

<svelte:head>
	<title>Admin - Proyectos | Portfolio</title>
</svelte:head>

<div class="projects-page">
	<header class="page-header">
		<h1>📁 Gestión de Proyectos</h1>
		<p class="subtitle">Administra proyectos y estructura del filesystem</p>
	</header>

	{#if data.error}
		<div class="error-message">
			<span>⚠️</span> {data.error}
		</div>
	{/if}

	{#if form?.error}
		<div class="error-message">
			<span>⚠️</span> {form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="success-message">
			<span>✓</span> Operación completada correctamente
		</div>
	{/if}

	<!-- Tabs -->
	<div class="tabs">
		<button 
			class="tab" 
			class:active={activeTab === 'projects'}
			onclick={() => activeTab = 'projects'}
		>
			📋 Proyectos ({data.projects?.length || 0})
		</button>
		<button 
			class="tab" 
			class:active={activeTab === 'filesystem'}
			onclick={() => activeTab = 'filesystem'}
		>
			🗂️ Filesystem
		</button>
		<button 
			class="tab" 
			class:active={activeTab === 'create'}
			onclick={() => activeTab = 'create'}
		>
			➕ Crear
		</button>
	</div>

	<!-- Content -->
	<div class="tab-content">
		{#if activeTab === 'projects'}
			<div class="projects-list">
				{#if data.projects?.length === 0}
					<div class="empty-state">
						<p>No hay proyectos en la base de datos.</p>
						<button class="btn-primary" onclick={() => activeTab = 'create'}>
							Crear primer proyecto
						</button>
					</div>
				{:else}
					{#each data.projects as project}
						<div class="project-card">
							<div class="project-header">
								<h3>{project.title}</h3>
								<span class="slug">/{project.slug}</span>
							</div>
							<p class="summary">
								{#if project.summary}
									{project.summary}
								{:else}
									<span class="no-summary">Sin resumen - Ejecutá los seeders o creá un proyecto nuevo para generar</span>
								{/if}
							</p>
							{#if project.keywords?.length}
								<div class="keywords">
									{#each project.keywords as keyword}
										<span class="keyword">{keyword}</span>
									{/each}
								</div>
							{/if}
							<div class="project-meta">
								<span>ID: {project.id}</span>
								<span>{new Date(project.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		{:else if activeTab === 'filesystem'}
			<div class="filesystem-section">
				<div class="section-header">
					<h3>🗂️ Estructura de Archivos</h3>
					<p class="hint">Click en una carpeta para expandir. Usa el botón 🗑️ para eliminar.</p>
				</div>
				
				{#if data.filesystem?.length === 0}
					<div class="empty-state">
						<p>No hay estructura de filesystem.</p>
					</div>
				{:else}
					<div class="tree">
						{#each data.filesystem as node}
							{@render fileNode(node, 0)}
						{/each}
					</div>
				{/if}

				<!-- Crear carpeta -->
				<div class="create-folder-inline">
					<h4>Nueva Carpeta Raíz</h4>
					<form method="POST" action="?/createFolder" use:enhance={() => {
						return async ({ update }) => {
							await update();
							newFolder.name = '';
						};
					}}>
						<input 
							type="text" 
							name="name" 
							placeholder="Nombre de la carpeta"
							bind:value={newFolder.name}
							required
						/>
						<button type="submit" class="btn-small">Crear</button>
					</form>
				</div>
			</div>
		{:else if activeTab === 'create'}
			<div class="create-section">
				<h3>➕ Nuevo Proyecto</h3>
				
				<div class="info-box">
					<h4>🧠 Retroalimentación de Memoria Automática</h4>
					<p>Al crear un proyecto, el sistema automáticamente:</p>
					<ul>
						<li>✓ Genera un resumen con IA del contenido</li>
						<li>✓ Actualiza <code>memory.md</code> con el nuevo proyecto</li>
						<li>✓ Actualiza <code>index.md</code> con nuevas tecnologías detectadas</li>
						<li>✓ Crea la memoria específica del proyecto en la BD</li>
						<li>✓ Crea el archivo .md en la carpeta seleccionada</li>
					</ul>
				</div>
				
				<form method="POST" action="?/createProject" use:enhance={() => {
					return async ({ update }) => {
						await update();
						if (form?.success) {
							resetForm();
							activeTab = 'projects';
						}
					};
				}}>
					<div class="form-group">
						<label for="name">Nombre del Proyecto</label>
						<input 
							type="text" 
							id="name"
							name="name" 
							placeholder="Mi Proyecto Awesome"
							bind:value={newProject.name}
							required
						/>
					</div>

					<div class="form-group">
						<label for="slug">Slug (URL)</label>
						<input 
							type="text" 
							id="slug"
							name="slug" 
							placeholder="mi-proyecto-awesome"
							bind:value={newProject.slug}
							required
						/>
						<span class="hint">Se genera automáticamente del nombre</span>
					</div>

					<div class="form-group">
						<label for="folderId">📁 Carpeta de destino (opcional)</label>
						<select 
							id="folderId" 
							name="folderId"
							bind:value={newProject.folderId}
						>
							<option value="">-- Sin archivo en filesystem --</option>
							{#each data.folders as folder}
								<option value={folder.id}>{folder.path}</option>
							{/each}
						</select>
						<span class="hint">Si seleccionás una carpeta, se creará un archivo {newProject.slug || 'proyecto'}.md ahí</span>
					</div>

					<div class="form-group">
						<label for="content">Contenido (Markdown)</label>
						<textarea 
							id="content"
							name="content" 
							rows="15"
							placeholder="# Mi Proyecto&#10;&#10;- **Tipo:** Personal/Corporativo&#10;- **Tech Stack:** React, Node.js, Docker&#10;&#10;## Descripción&#10;Este proyecto..."
							bind:value={newProject.content}
							required
						></textarea>
						<span class="hint">Incluí: Tipo, Tech Stack, Descripción y Características para mejor detección</span>
					</div>

					<div class="form-group">
						<label for="keywords">Keywords (separadas por coma)</label>
						<input 
							type="text" 
							id="keywords"
							name="keywords" 
							placeholder="react, typescript, portfolio"
							bind:value={newProject.keywords}
						/>
						<span class="hint">Se detectan automáticamente si no se especifican</span>
					</div>

					<button type="submit" class="btn-primary">
						🚀 Crear Proyecto y Actualizar Memorias
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>

<!-- Modal de confirmación -->
{#if confirmDelete}
	<div class="modal-overlay" role="button" tabindex="-1" onclick={() => confirmDelete = null} onkeydown={(e) => e.key === 'Escape' && (confirmDelete = null)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<h3>⚠️ Confirmar Eliminación</h3>
			<p>¿Estás seguro de que querés eliminar {confirmDelete.type === 'folder' ? 'la carpeta' : 'el archivo'} <strong>{confirmDelete.name}</strong>?</p>
			{#if confirmDelete.type === 'folder'}
				<p class="warning">Esto eliminará todo el contenido dentro de la carpeta.</p>
			{/if}
			<div class="modal-actions">
				<button class="btn-cancel" onclick={() => confirmDelete = null}>Cancelar</button>
				<form 
					method="POST" 
					action={confirmDelete.type === 'folder' ? '?/deleteFolder' : '?/deleteFile'}
					use:enhance={() => {
						return async ({ update }) => {
							confirmDelete = null;
							await update();
						};
					}}
				>
					<input type="hidden" name={confirmDelete.type === 'folder' ? 'folderId' : 'fileId'} value={confirmDelete.id} />
					<button type="submit" class="btn-danger">Eliminar</button>
				</form>
			</div>
		</div>
	</div>
{/if}

{#snippet fileNode(node: any, depth: number)}
	<div class="tree-node" style="padding-left: {depth * 20}px">
		{#if node.type === 'folder'}
			<div class="folder-row">
				<button class="folder-toggle" onclick={() => toggleFolder(node.id)}>
					{expandedFolders.has(node.id) ? '📂' : '📁'}
					<span class="folder-name">{node.name}</span>
					{#if node.children?.length}
						<span class="count">({node.children.length})</span>
					{/if}
				</button>
				<button 
					class="btn-delete" 
					title="Eliminar carpeta"
					onclick={() => confirmDelete = { type: 'folder', id: node.id, name: node.name }}
				>
					🗑️
				</button>
			</div>
			{#if expandedFolders.has(node.id) && node.children}
				{#each node.children as child}
					{@render fileNode(child, depth + 1)}
				{/each}
			{/if}
		{:else}
			<div class="file-row">
				<span class="file-icon">
					{#if node.fileType === 'markdown'}📄
					{:else if node.fileType === 'code'}💻
					{:else}📝{/if}
				</span>
				<span class="file-name">{node.name}</span>
				<button 
					class="btn-delete" 
					title="Eliminar archivo"
					onclick={() => confirmDelete = { type: 'file', id: node.id, name: node.name }}
				>
					🗑️
				</button>
			</div>
		{/if}
	</div>
{/snippet}

<style>
	.projects-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		font-size: 1.6rem;
		color: #00ff00;
		font-family: 'Courier New', monospace;
		margin-bottom: 0.3rem;
	}

	.subtitle {
		color: #888;
		font-size: 0.85rem;
		font-family: 'Courier New', monospace;
	}

	.error-message, .success-message {
		padding: 0.8rem 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-family: 'Courier New', monospace;
		font-size: 0.85rem;
	}

	.error-message {
		background: rgba(255, 0, 0, 0.1);
		border: 1px solid #ff4444;
		color: #ff6666;
	}

	.success-message {
		background: rgba(0, 255, 0, 0.1);
		border: 1px solid #00ff00;
		color: #00ff00;
	}

	/* Tabs */
	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	.tab {
		padding: 0.6rem 1rem;
		background: transparent;
		border: 1px solid #333;
		color: #888;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		font-size: 0.85rem;
		border-radius: 4px 4px 0 0;
		transition: all 0.2s;
	}

	.tab:hover {
		color: #00ff00;
		border-color: #00ff00;
	}

	.tab.active {
		background: rgba(0, 255, 0, 0.1);
		color: #00ff00;
		border-color: #00ff00;
	}

	/* Projects List */
	.projects-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.project-card {
		background: rgba(0, 255, 0, 0.03);
		border: 1px solid #333;
		border-radius: 6px;
		padding: 1rem;
	}

	.project-card:hover {
		border-color: #00ff00;
	}

	.project-header {
		display: flex;
		align-items: baseline;
		gap: 0.8rem;
		margin-bottom: 0.5rem;
	}

	.project-header h3 {
		color: #00ff00;
		font-size: 1.1rem;
		font-family: 'Courier New', monospace;
	}

	.slug {
		color: #666;
		font-size: 0.8rem;
		font-family: 'Courier New', monospace;
	}

	.summary {
		color: #aaa;
		font-size: 0.85rem;
		line-height: 1.4;
		margin-bottom: 0.8rem;
	}

	.no-summary {
		color: #666;
		font-style: italic;
		font-size: 0.8rem;
	}

	.keywords {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.8rem;
	}

	.keyword {
		background: rgba(0, 255, 0, 0.1);
		color: #00ff00;
		padding: 0.2rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		font-family: 'Courier New', monospace;
	}

	.project-meta {
		display: flex;
		gap: 1rem;
		color: #555;
		font-size: 0.75rem;
		font-family: 'Courier New', monospace;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #666;
	}

	.empty-state p {
		margin-bottom: 1rem;
	}

	/* Filesystem */
	.filesystem-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-header h3 {
		color: #00ff00;
		font-family: 'Courier New', monospace;
		margin-bottom: 0.3rem;
	}

	.hint {
		color: #666;
		font-size: 0.8rem;
	}

	.tree {
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid #333;
		border-radius: 4px;
		padding: 1rem;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
	}

	.tree-node {
		padding: 0.2rem 0;
	}

	.folder-row, .file-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.folder-toggle {
		background: none;
		border: none;
		color: #00ff00;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem;
		font-family: inherit;
		font-size: inherit;
	}

	.folder-toggle:hover {
		background: rgba(0, 255, 0, 0.1);
		border-radius: 3px;
	}

	.folder-name {
		color: #00ff00;
	}

	.count {
		color: #555;
		font-size: 0.8rem;
	}

	.file-icon {
		margin-left: 0.5rem;
	}

	.file-name {
		color: #aaa;
	}

	.btn-delete {
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.3;
		padding: 0.2rem;
		font-size: 0.9rem;
		transition: opacity 0.2s;
	}

	.btn-delete:hover {
		opacity: 1;
	}

	/* Create Folder Inline */
	.create-folder-inline {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid #333;
		border-radius: 4px;
	}

	.create-folder-inline h4 {
		color: #888;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
	}

	.create-folder-inline form {
		display: flex;
		gap: 0.5rem;
	}

	.create-folder-inline input {
		flex: 1;
		padding: 0.5rem;
		background: #111;
		border: 1px solid #333;
		color: #fff;
		border-radius: 3px;
		font-family: 'Courier New', monospace;
	}

	.btn-small {
		padding: 0.5rem 1rem;
		background: rgba(0, 255, 0, 0.1);
		border: 1px solid #00ff00;
		color: #00ff00;
		cursor: pointer;
		border-radius: 3px;
		font-family: 'Courier New', monospace;
	}

	/* Create Section */
	.create-section {
		max-width: 600px;
	}

	.create-section h3 {
		color: #00ff00;
		font-family: 'Courier New', monospace;
		margin-bottom: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.2rem;
	}

	.form-group label {
		display: block;
		color: #888;
		font-size: 0.85rem;
		margin-bottom: 0.4rem;
		font-family: 'Courier New', monospace;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.7rem;
		background: #111;
		border: 1px solid #333;
		color: #fff;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #00ff00;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 200px;
	}

	.form-group .hint {
		display: block;
		margin-top: 0.3rem;
	}

	.btn-primary {
		padding: 0.8rem 1.5rem;
		background: rgba(0, 255, 0, 0.15);
		border: 1px solid #00ff00;
		color: #00ff00;
		cursor: pointer;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.btn-primary:hover {
		background: rgba(0, 255, 0, 0.25);
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: #1a1a1a;
		border: 1px solid #333;
		border-radius: 8px;
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
	}

	.modal h3 {
		color: #ff6666;
		margin-bottom: 1rem;
		font-family: 'Courier New', monospace;
	}

	.modal p {
		color: #aaa;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.modal .warning {
		color: #ff6666;
		font-size: 0.85rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.8rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	.btn-cancel {
		padding: 0.6rem 1rem;
		background: transparent;
		border: 1px solid #555;
		color: #888;
		cursor: pointer;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
	}

	.btn-danger {
		padding: 0.6rem 1rem;
		background: rgba(255, 0, 0, 0.15);
		border: 1px solid #ff4444;
		color: #ff6666;
		cursor: pointer;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
	}

	.btn-danger:hover {
		background: rgba(255, 0, 0, 0.25);
	}

	/* Info box para retroalimentación */
	.info-box {
		background: rgba(0, 200, 255, 0.08);
		border: 1px solid rgba(0, 200, 255, 0.3);
		border-radius: 6px;
		padding: 1rem 1.2rem;
		margin-bottom: 1.5rem;
	}

	.info-box h4 {
		color: #00c8ff;
		margin: 0 0 0.5rem 0;
		font-size: 0.95rem;
		font-family: 'Courier New', monospace;
	}

	.info-box p {
		color: #aaa;
		margin: 0 0 0.5rem 0;
		font-size: 0.85rem;
	}

	.info-box ul {
		margin: 0;
		padding-left: 1.2rem;
		color: #888;
		font-size: 0.85rem;
	}

	.info-box li {
		margin-bottom: 0.3rem;
	}

	.info-box code {
		background: rgba(0, 255, 0, 0.1);
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
		color: #00ff00;
		font-size: 0.85em;
	}

	/* Select styling */
	.form-group select {
		width: 100%;
		padding: 0.6rem;
		background: #222;
		border: 1px solid #444;
		color: #ddd;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
	}

	.form-group select:focus {
		outline: none;
		border-color: #00ff00;
	}

	.form-group select option {
		background: #222;
		color: #ddd;
	}
</style>
