<script lang="ts">
	/**
	 * Carga un proyecto desde uno o varios archivos Markdown.
	 *
	 * Un proyecto documentado en serio rara vez es un solo archivo: suele ser un
	 * `README.md` más una carpeta `docs/` con la arquitectura, el despliegue y el
	 * troubleshooting. Acá se eligen todos juntos y se combinan en **un** documento:
	 * el primero manda —de él salen el título y el slug— y a los demás se les baja
	 * un nivel los encabezados, así el resultado tiene un solo `#` y el resto son
	 * secciones.
	 *
	 * El orden se puede cambiar antes de cargar, y el contenido combinado queda
	 * editable: lo que se manda es lo que se ve.
	 *
	 * El backend hace el resto: crea la memoria, traduce al inglés, arma la carpeta
	 * `~/proyectos/<slug>` y regenera las secciones del perfil.
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

	/** Un archivo del proyecto. El primero de la lista define título y slug. */
	type Part = {
		fileName: string;
		title: string;
		slug: string;
		keywords: string;
		body: string;
	};

	let parts = $state<Part[]>([]);

	const suggestedSlug = $derived(
		title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
	);

	const effectiveSlug = $derived(slug.trim() || suggestedSlug);

	async function handleFileLoad(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		if (files.length === 0) return;

		const valid = files.filter((f) => /\.(md|markdown|txt)$/i.test(f.name));
		const invalid = files.filter((f) => !valid.includes(f));

		result =
			invalid.length > 0
				? { error: `Solo .md, .markdown o .txt — descartados: ${invalid.map((f) => f.name).join(', ')}` }
				: null;

		if (valid.length === 0) return;

		// Orden alfabético por nombre, que es el que el autor eligió al numerarlos
		// (`00_general.md`, `01_totem.md`…). Se puede cambiar a mano después.
		valid.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

		parts = await Promise.all(valid.map(readAsPart));
		applyParts();
	}

	/** Lee un archivo y saca de su frontmatter lo que sirva. */
	async function readAsPart(file: File): Promise<Part> {
		const raw = await file.text();
		// El frontmatter es para el seeder; acá lo sacamos y usamos sus valores.
		const { data, body } = parseFrontmatter(raw);

		const derivedTitle =
			data.title || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || file.name.replace(/\.[^.]+$/, '');

		return {
			fileName: file.name,
			title: derivedTitle,
			slug: data.slug || '',
			keywords: data.keywords || '',
			body
		};
	}

	/**
	 * Combina las partes en un solo documento y completa los campos del formulario.
	 *
	 * A partir de la segunda parte se le baja un nivel a cada encabezado: si cada
	 * archivo trae su propio `#`, el documento combinado terminaría con cinco
	 * títulos de primer nivel y ninguna jerarquía.
	 */
	function applyParts() {
		if (parts.length === 0) return;

		const [primera, ...resto] = parts;

		content = [primera.body, ...resto.map((parte) => demoteHeadings(parte.body))].join('\n\n---\n\n');

		title = primera.title;
		slug = primera.slug || toSlug(primera.title);
		fileName =
			parts.length === 1 ? primera.fileName : `${parts.length} archivos · ${primera.fileName} + ${parts.length - 1}`;

		// Las keywords de todas las partes, sin repetir.
		const todas = parts
			.flatMap((parte) => parte.keywords.split(','))
			.map((k) => k.trim())
			.filter(Boolean);
		keywords = [...new Set(todas)].join(', ');
	}

	/** `#` → `##`, `##` → `###`… sin tocar lo que esté dentro de un bloque de código. */
	function demoteHeadings(markdown: string): string {
		const bloques = markdown.split(/(```[\s\S]*?```)/);
		return bloques
			.map((bloque, i) => (i % 2 ? bloque : bloque.replace(/^(#{1,5}) /gm, '#$1 ')))
			.join('');
	}

	function movePart(index: number, delta: number) {
		const destino = index + delta;
		if (destino < 0 || destino >= parts.length) return;
		[parts[index], parts[destino]] = [parts[destino], parts[index]];
		applyParts();
	}

	function removePart(index: number) {
		parts.splice(index, 1);
		if (parts.length === 0) resetForm();
		else applyParts();
	}

	function toSlug(text: string): string {
		return text
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');
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

	/** El alta contra la API. La usan el formulario y la cola. */
	async function postProject(project: {
		title: string;
		slug: string;
		content: string;
		keywords: string;
	}): Promise<{ ok: true } | { ok: false; error: string }> {
		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					name: project.title.trim(),
					slug: project.slug,
					content: project.content,
					keywords: project.keywords
						.split(',')
						.map((k) => k.trim())
						.filter(Boolean),
					folderId: folderId ? parseInt(folderId, 10) : undefined
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				return { ok: false, error: error.message || `Error ${response.status} creando el proyecto` };
			}

			return { ok: true };
		} catch {
			return { ok: false, error: 'Error de conexión con el servidor' };
		}
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

		const outcome = await postProject({ title, slug: effectiveSlug, content, keywords });
		loading = false;

		if (!outcome.ok) {
			result = { error: outcome.error };
			return;
		}

		result = { success: true, message: `Proyecto "${effectiveSlug}" cargado` };
		resetForm();
		onCreated?.();
	}

	function resetForm() {
		title = '';
		slug = '';
		content = '';
		keywords = '';
		fileName = '';
		parts = [];
		if (fileInput) fileInput.value = '';
	}
</script>

<div class="loader">
	<div class="loader-header">
		<h3>📁 Cargar proyectos desde .md</h3>
		<p>
			Se crea la memoria para la IA y la carpeta <code>~/proyectos/&lt;slug&gt;</code> de la
			terminal, se traduce el contenido al inglés y, sin keywords, las genera la IA.
			Si el proyecto está documentado en <strong>varios archivos</strong> —un README y su
			carpeta <code>docs/</code>— elegilos todos: se combinan en un solo documento.
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
				multiple
				accept=".md,.markdown,.txt"
				onchange={handleFileLoad}
			/>
			{#if fileName}
				<span class="hint">📄 {fileName} — {content.length} caracteres</span>
			{:else if parts.length > 1}
				<span class="hint">📄 {parts.length} archivos combinados — {content.length} caracteres</span>
			{/if}
		</div>

		{#if parts.length > 1}
			<div class="field">
				<span class="parts-label">Partes del proyecto</span>
				<ul class="parts">
					{#each parts as part, i (part.fileName)}
						<li class="part">
							<span class="part-order">{i + 1}</span>
							<span class="part-name">
								<strong>{part.fileName}</strong>
								<span class="part-hint">
									{i === 0 ? 'define el título y el slug' : 'encabezados un nivel más abajo'}
								</span>
							</span>
							<span class="part-actions">
								<button type="button" onclick={() => movePart(i, -1)} disabled={i === 0} title="Subir">↑</button>
								<button type="button" onclick={() => movePart(i, 1)} disabled={i === parts.length - 1} title="Bajar">↓</button>
								<button type="button" onclick={() => removePart(i)} title="Quitar">✕</button>
							</span>
						</li>
					{/each}
				</ul>
				<span class="hint">
					Se combinan en un solo documento, en este orden. El resultado queda editable abajo.
				</span>
			</div>
		{/if}

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
			<button type="button" onclick={() => resetForm()} disabled={loading}>Limpiar</button>
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

	.parts-label {
		display: block;
		color: var(--theme-text-muted, #888);
		font-size: 0.8rem;
		margin-bottom: 0.4rem;
	}

	.parts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.part {
		display: grid;
		grid-template-columns: 1.6rem minmax(0, 1fr) auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.45rem 0.6rem;
		border-radius: 4px;
		border: 1px solid var(--theme-border, #333);
		font-size: 0.85rem;
	}

	.part-order {
		color: var(--theme-text-muted, #888);
		text-align: center;
	}

	.part-name {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.part-name strong {
		color: var(--theme-text-primary, #e0e0e0);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.part-hint {
		color: var(--theme-text-muted, #888);
		font-size: 0.75rem;
	}

	.part-actions {
		display: flex;
		gap: 0.2rem;
	}

	.part-actions button {
		background: transparent;
		border: 1px solid var(--theme-border, #333);
		color: var(--theme-text-muted, #888);
		border-radius: 3px;
		padding: 0.1rem 0.4rem;
		cursor: pointer;
		line-height: 1.4;
	}

	.part-actions button:hover:not(:disabled) {
		color: var(--theme-text-primary, #e0e0e0);
		border-color: var(--theme-accent, #4ec9b0);
	}

	.part-actions button:disabled {
		opacity: 0.3;
		cursor: default;
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
