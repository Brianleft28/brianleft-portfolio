<script lang="ts">
	/**
	 * Carga un proyecto desde un archivo Markdown.
	 *
	 * Lee el `.md`, propone título y slug, deja elegir la carpeta destino del
	 * filesystem virtual y lo manda a `POST /api/projects`. El backend crea la
	 * memoria, genera las keywords con IA si no se especifican, y regenera las
	 * secciones de proyectos del perfil.
	 */
	type Folder = { id: number; name: string; path: string };

	let {
		folders = [],
		onCreated
	}: {
		folders?: Folder[];
		onCreated?: () => void;
	} = $props();

	let title = $state('');
	let slug = $state('');
	let content = $state('');
	let keywords = $state('');
	let folderId = $state<string>('');
	let fileName = $state('');

	let loading = $state(false);
	let result = $state<{ success?: boolean; error?: string; message?: string } | null>(null);
	let fileInput: HTMLInputElement;

	const suggestedSlug = $derived(
		title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
	);

	const effectiveSlug = $derived(slug.trim() || suggestedSlug);

	function handleFileLoad(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!/\.(md|markdown|txt)$/i.test(file.name)) {
			result = { error: 'Solo se permiten archivos .md, .markdown o .txt' };
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const raw = (e.target?.result as string) || '';
			// El frontmatter es para el seeder; acá lo sacamos y usamos sus valores.
			const { data, body } = parseFrontmatter(raw);

			content = body;
			fileName = file.name;
			result = null;

			title = data.title || title || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
			if (data.slug) slug = data.slug;
			if (data.keywords) keywords = data.keywords;
		};
		reader.readAsText(file);
	}

	/** Parser mínimo, sólo para las claves que usamos: title, slug, keywords. */
	function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
		const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
		if (!match) return { data: {}, body: raw.trim() };

		const data: Record<string, string> = {};
		for (const line of match[1].split(/\r?\n/)) {
			const separator = line.indexOf(':');
			if (separator === -1) continue;

			const key = line.slice(0, separator).trim();
			let value = line.slice(separator + 1).trim();
			if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1);
			value = value.replace(/^["']|["']$/g, '');
			if (key && value) data[key] = value;
		}

		return { data, body: raw.slice(match[0].length).trim() };
	}

	async function handleSubmit() {
		if (!title.trim() || !content.trim()) {
			result = { error: 'Falta el título o el contenido' };
			return;
		}
		if (!effectiveSlug) {
			result = { error: 'No se pudo generar un slug a partir del título' };
			return;
		}

		loading = true;
		result = null;

		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: title.trim(),
					slug: effectiveSlug,
					content,
					keywords: keywords
						.split(',')
						.map((k) => k.trim())
						.filter(Boolean),
					folderId: folderId ? parseInt(folderId, 10) : undefined
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				result = { error: error.message || `Error ${response.status} creando el proyecto` };
				return;
			}

			result = { success: true, message: `Proyecto "${effectiveSlug}" cargado` };
			resetForm();
			onCreated?.();
		} catch {
			result = { error: 'Error de conexión con el servidor' };
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		title = '';
		slug = '';
		content = '';
		keywords = '';
		fileName = '';
		if (fileInput) fileInput.value = '';
	}
</script>

<div class="loader">
	<div class="loader-header">
		<h3>📁 Cargar proyecto desde .md</h3>
		<p>
			Se crea la memoria para la IA y la carpeta <code>~/proyectos/&lt;slug&gt;</code> de la
			terminal. Sin keywords, las genera la IA.
		</p>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="field">
			<label for="pl-file">Archivo Markdown</label>
			<input
				id="pl-file"
				bind:this={fileInput}
				type="file"
				accept=".md,.markdown,.txt"
				onchange={handleFileLoad}
			/>
			{#if fileName}
				<span class="hint">📄 {fileName} — {content.length} caracteres</span>
			{/if}
		</div>

		<div class="row">
			<div class="field">
				<label for="pl-title">Título</label>
				<input id="pl-title" type="text" bind:value={title} placeholder="Nombre del proyecto" />
			</div>

			<div class="field">
				<label for="pl-slug">Slug</label>
				<input id="pl-slug" type="text" bind:value={slug} placeholder={suggestedSlug || 'mi-proyecto'} />
				{#if effectiveSlug}
					<span class="hint">~/proyectos/{effectiveSlug}/README.md</span>
				{/if}
			</div>
		</div>

		<div class="row">
			<div class="field">
				<label for="pl-keywords">Keywords (separadas por coma)</label>
				<input
					id="pl-keywords"
					type="text"
					bind:value={keywords}
					placeholder="vacío = las genera la IA"
				/>
			</div>

			<div class="field">
				<label for="pl-folder">Carpeta destino (opcional)</label>
				<select id="pl-folder" bind:value={folderId}>
					<option value="">— sin archivo suelto —</option>
					{#each folders as folder (folder.id)}
						<option value={String(folder.id)}>{folder.path || folder.name}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if content}
			<div class="field">
				<label for="pl-preview">Contenido</label>
				<textarea id="pl-preview" bind:value={content} rows="10"></textarea>
			</div>
		{/if}

		{#if result?.error}
			<div class="alert error">❌ {result.error}</div>
		{:else if result?.success}
			<div class="alert ok">✅ {result.message}</div>
		{/if}

		<div class="actions">
			<button type="submit" class="primary" disabled={loading}>
				{loading ? 'Cargando…' : 'Cargar proyecto'}
			</button>
			<button type="button" onclick={resetForm} disabled={loading}>Limpiar</button>
		</div>
	</form>
</div>

<style>
	.loader {
		padding: 1rem 0;
	}

	.loader-header h3 {
		color: var(--theme-text-primary, #e0e0e0);
		font-size: 1.1rem;
		margin: 0 0 0.35rem;
	}

	.loader-header p {
		color: var(--theme-text-muted, #888);
		font-size: 0.85rem;
		margin: 0 0 1.25rem;
	}

	.row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		margin-bottom: 1rem;
	}

	.field label {
		color: var(--theme-text-muted, #888);
		font-size: 0.8rem;
		margin-bottom: 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field input,
	.field select,
	.field textarea {
		background: var(--theme-bg-secondary, #1a1a2e);
		border: 1px solid var(--theme-border, #333);
		border-radius: 4px;
		color: var(--theme-text-primary, #e0e0e0);
		font-family: inherit;
		font-size: 0.9rem;
		padding: 0.55rem 0.7rem;
	}

	.field textarea {
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.8rem;
		resize: vertical;
	}

	.hint {
		color: var(--theme-text-muted, #666);
		font-size: 0.75rem;
		margin-top: 0.3rem;
	}

	.alert {
		border-radius: 4px;
		font-size: 0.85rem;
		margin-bottom: 1rem;
		padding: 0.7rem 0.9rem;
	}

	.alert.error {
		background: rgba(220, 53, 69, 0.12);
		border: 1px solid rgba(220, 53, 69, 0.4);
		color: #ff8892;
	}

	.alert.ok {
		background: rgba(78, 201, 176, 0.12);
		border: 1px solid rgba(78, 201, 176, 0.4);
		color: #4ec9b0;
	}

	.actions {
		display: flex;
		gap: 0.6rem;
	}

	.actions button {
		background: transparent;
		border: 1px solid var(--theme-border, #333);
		border-radius: 4px;
		color: var(--theme-text-primary, #e0e0e0);
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.55rem 1.1rem;
	}

	.actions button.primary {
		background: var(--theme-accent, #4ec9b0);
		border-color: var(--theme-accent, #4ec9b0);
		color: #0d0d1a;
		font-weight: 600;
	}

	.actions button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
</style>
