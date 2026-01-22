<script lang="ts">
	import { onMount } from 'svelte';

	interface AiPersonality {
		id: number;
		slug: string;
		name: string;
		displayName: string;
		description: string;
		systemPrompt: string;
		greeting: string | null;
		traits: string[] | null;
		language: string;
		voiceStyle: string | null;
		mode: string;
		active: boolean;
		isDefault: boolean;
	}

	interface AiSetting {
		id: number;
		key: string;
		value: string;
	}

	let personalities: AiPersonality[] = $state([]);
	let selectedPersonality: AiPersonality | null = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let message = $state('');
	let messageType: 'success' | 'error' = $state('success');
	let showCreateModal = $state(false);
	let newPersonalityName = $state('');

	// Settings globales de AI
	let aiCommand = $state('torvalds');
	let aiName = $state('TorvaldsAI');
	let aiGreeting = $state('');
	let savingSettings = $state(false);

	// Form state para personalidad seleccionada
	let formName = $state('');
	let formDisplayName = $state('');
	let formDescription = $state('');
	let formSystemPrompt = $state('');
	let formGreeting = $state('');
	let formTraits = $state('');
	let formLanguage = $state('es-AR');
	let formVoiceStyle = $state('technical');

	// Modos base (no borrables)
	const fixedModes = ['arquitecto', 'asistente'];

	// Prompt base para personalidades nuevas
	const BASE_CUSTOM_PROMPT = `## IDENTIDAD

Sos {{ai_name}}, el asistente AI del portfolio de {{owner_name}}.
{{owner_name}} es {{owner_role}} ubicado en {{owner_location}}.

## TU ROL

Tu único propósito es hablar sobre:
- {{owner_name}}: su experiencia, habilidades, proyectos
- Los proyectos documentados en este portfolio
- Cómo contactar: {{owner_email}}

## RESTRICCIONES

- NO des tutoriales de código
- NO escribas funciones o clases
- Redirigi cualquier pregunta off-topic a los proyectos de {{owner_name}}

## PERSONALIDAD

[Definí aquí cómo debería comportarse el asistente]`;

	const voiceStyles = [
		{ value: 'casual', label: 'Casual' },
		{ value: 'formal', label: 'Formal' },
		{ value: 'technical', label: 'Técnico' },
		{ value: 'friendly', label: 'Amigable' },
		{ value: 'technical-casual', label: 'Técnico Casual' },
		{ value: 'technical-focused', label: 'Técnico Enfocado' },
		{ value: 'professional', label: 'Profesional' }
	];

	onMount(async () => {
		await Promise.all([loadPersonalities(), loadAiSettings()]);
	});

	async function loadAiSettings() {
		try {
			const response = await fetch('/api/settings', { credentials: 'include' });
			if (response.ok) {
				const settings: AiSetting[] = await response.json();
				const aiSettings = settings.filter(s => s.key.startsWith('ai_'));
				for (const s of aiSettings) {
					if (s.key === 'ai_command') aiCommand = s.value;
					if (s.key === 'ai_name') aiName = s.value;
					if (s.key === 'ai_greeting') aiGreeting = s.value;
				}
			}
		} catch (error) {
			console.error('Error loading AI settings:', error);
		}
	}

	async function saveAiSettings() {
		savingSettings = true;
		try {
			const response = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify([
					{ key: 'ai_command', value: aiCommand },
					{ key: 'ai_name', value: aiName },
					{ key: 'ai_greeting', value: aiGreeting }
				])
			});
			if (response.ok) {
				message = '✓ Configuración global guardada';
				messageType = 'success';
			} else {
				throw new Error('Error al guardar');
			}
		} catch (error) {
			message = '✗ Error al guardar configuración';
			messageType = 'error';
		} finally {
			savingSettings = false;
		}
	}

	async function loadPersonalities() {
		loading = true;
		try {
			const response = await fetch('/api/ai-personalities', {
				credentials: 'include'
			});
			if (response.ok) {
				personalities = await response.json();
				// Seleccionar la activa o la primera
				const active = personalities.find(p => p.active) || personalities[0];
				if (active) {
					selectPersonality(active);
				}
			}
		} catch (error) {
			console.error('Error loading AI personalities:', error);
		} finally {
			loading = false;
		}
	}

	function selectPersonality(p: AiPersonality) {
		selectedPersonality = p;
		formName = p.name || '';
		formDisplayName = p.displayName || '';
		formDescription = p.description || '';
		formSystemPrompt = p.systemPrompt || '';
		formGreeting = p.greeting || '';
		formTraits = p.traits?.join(', ') || '';
		formLanguage = p.language || 'es-AR';
		formVoiceStyle = p.voiceStyle || 'technical';
	}

	function isFixedMode(p: AiPersonality): boolean {
		return fixedModes.includes(p.slug);
	}

	function getModeIcon(mode: string): string {
		switch (mode) {
			case 'arquitecto': return '🏗️';
			case 'asistente': return '💼';
			default: return '⚙️';
		}
	}

	function getModeLabel(mode: string): string {
		switch (mode) {
			case 'arquitecto': return 'Arquitecto';
			case 'asistente': return 'Asistente';
			case 'custom': return 'Personalizado';
			default: return mode;
		}
	}

	// Ordenar: fijos primero (arquitecto, asistente), luego custom
	function sortedPersonalities(list: AiPersonality[]): AiPersonality[] {
		return [...list].sort((a, b) => {
			const order = ['arquitecto', 'asistente'];
			const aIdx = order.indexOf(a.slug);
			const bIdx = order.indexOf(b.slug);
			if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
			if (aIdx !== -1) return -1;
			if (bIdx !== -1) return 1;
			return a.id - b.id; // custom al final por ID
		});
	}

	async function savePersonality() {
		if (!selectedPersonality) return;
		saving = true;
		message = '';

		try {
			const isFixed = isFixedMode(selectedPersonality);
			
			const payload = {
				displayName: formDisplayName,
				description: formDescription,
				greeting: formGreeting || null,
				traits: formTraits ? formTraits.split(',').map((t) => t.trim()) : null,
				language: formLanguage,
				voiceStyle: formVoiceStyle,
				...(isFixed ? {} : {
					name: formName,
					slug: formName.toLowerCase().replace(/\s+/g, '-'),
					systemPrompt: formSystemPrompt,
				})
			};

			const response = await fetch(`/api/ai-personalities/${selectedPersonality.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify(payload)
			});

			if (response.ok) {
				message = '✓ Personalidad actualizada';
				messageType = 'success';
				await loadPersonalities();
			} else {
				throw new Error('Error al guardar');
			}
		} catch (error) {
			message = '✗ Error al guardar';
			messageType = 'error';
		} finally {
			saving = false;
		}
	}

	async function activatePersonality(p: AiPersonality) {
		try {
			const response = await fetch(`/api/ai-personalities/${p.id}/activate`, {
				method: 'POST',
				credentials: 'include'
			});
			if (response.ok) {
				message = `✓ ${p.displayName || p.name} activado`;
				messageType = 'success';
				await loadPersonalities();
			}
		} catch (error) {
			message = '✗ Error al activar';
			messageType = 'error';
		}
	}

	function openCreateModal() {
		newPersonalityName = '';
		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		newPersonalityName = '';
	}

	async function createPersonality() {
		if (!newPersonalityName.trim()) return;
		
		try {
			const slug = newPersonalityName.toLowerCase().replace(/\s+/g, '-');
			const response = await fetch('/api/ai-personalities', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					slug,
					name: newPersonalityName,
					displayName: newPersonalityName,
					description: 'Personalidad personalizada',
					systemPrompt: BASE_CUSTOM_PROMPT,
					greeting: '¡Hola! Soy {{ai_name}}. ¿Qué querés saber sobre {{owner_name}}?',
					traits: ['profesional', 'amable'],
					language: 'es-AR',
					voiceStyle: 'professional',
					mode: 'custom',
					active: false,
					isDefault: false
				})
			});

			if (response.ok) {
				message = `✓ Personalidad "${newPersonalityName}" creada`;
				messageType = 'success';
				closeCreateModal();
				await loadPersonalities();
			} else {
				throw new Error('Error al crear');
			}
		} catch (error) {
			message = '✗ Error al crear la personalidad';
			messageType = 'error';
		}
	}

	async function deletePersonality(p: AiPersonality) {
		if (isFixedMode(p)) return;
		if (!confirm(`¿Eliminar la personalidad "${p.displayName || p.name}"?`)) return;

		try {
			const response = await fetch(`/api/ai-personalities/${p.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (response.ok) {
				message = `✓ Personalidad eliminada`;
				messageType = 'success';
				await loadPersonalities();
			} else {
				throw new Error('Error al eliminar');
			}
		} catch (error) {
			message = '✗ Error al eliminar';
			messageType = 'error';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showCreateModal) {
			closeCreateModal();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="ai-config">
	<h2>🤖 Configuración de IA & Personalidad</h2>

	{#if message}
		<div class="message {messageType}">{message}</div>
	{/if}

	{#if loading}
		<div class="loading">Cargando configuración...</div>
	{:else}
		<!-- Configuración Global del Comando -->
		<div class="form-section">
			<h3>⌨️ Configuración del Comando</h3>
			<p class="section-desc">Estos valores afectan cómo se invoca y presenta el asistente en la terminal.</p>
			
			<div class="form-row three-cols">
				<div class="form-group">
					<label for="aiCommand">Comando</label>
					<input
						type="text"
						id="aiCommand"
						bind:value={aiCommand}
						placeholder="torvalds"
					/>
					<span class="hint">Comando para invocar (ej: {aiCommand} start)</span>
				</div>

				<div class="form-group">
					<label for="aiNameGlobal">Nombre del AI</label>
					<input
						type="text"
						id="aiNameGlobal"
						bind:value={aiName}
						placeholder="TorvaldsAI"
					/>
					<span class="hint">Nombre mostrado en respuestas</span>
				</div>

				<div class="form-group">
					<label for="aiGreetingGlobal">Saludo por defecto</label>
					<input
						type="text"
						id="aiGreetingGlobal"
						bind:value={aiGreeting}
						placeholder="¡Hola! Preguntame sobre proyectos..."
					/>
					<span class="hint">Mensaje inicial al activar</span>
				</div>
			</div>

			<div class="form-actions-inline">
				<button type="button" class="btn-primary btn-sm" onclick={saveAiSettings} disabled={savingSettings}>
					{savingSettings ? 'Guardando...' : '💾 Guardar Config Global'}
				</button>
			</div>
		</div>

		<!-- Selector de personalidades -->
		<div class="form-section">
			<div class="personalities-header">
				<h3>🎭 Personalidades Disponibles</h3>
				<button type="button" class="btn-create" onclick={openCreateModal}>
					+ Nueva
				</button>
			</div>
			
			<div class="personalities-grid">
				{#each sortedPersonalities(personalities) as p (p.id)}
					<div
						role="button"
						tabindex="0"
						class="personality-card"
						class:selected={selectedPersonality?.id === p.id}
						class:is-active={p.active}
						onclick={() => selectPersonality(p)}
						onkeydown={(e) => e.key === 'Enter' && selectPersonality(p)}
					>
						<div class="personality-header">
							<span class="personality-icon">{getModeIcon(p.mode)}</span>
							<span class="personality-mode">{getModeLabel(p.mode)}</span>
							{#if p.active}
								<span class="active-badge">ACTIVO</span>
							{/if}
						</div>
						<p class="personality-name-big">{p.displayName || p.name}</p>
						<div class="personality-actions">
							{#if !p.active}
								<button 
									type="button" 
									class="btn-activate"
									onclick={(e) => { e.stopPropagation(); activatePersonality(p); }}
								>
									Activar
								</button>
							{/if}
							{#if !isFixedMode(p)}
								<button 
									type="button" 
									class="btn-delete"
									onclick={(e) => { e.stopPropagation(); deletePersonality(p); }}
								>
									🗑️
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Modal para crear personalidad -->
		{#if showCreateModal}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div 
				class="confirm-overlay" 
				role="presentation"
				onclick={closeCreateModal}
				onkeydown={(e) => e.key === 'Escape' && closeCreateModal()}
			>
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div 
					class="confirm-modal" 
					role="dialog" 
					aria-modal="true" 
					tabindex="-1"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<h3>✨ Nueva Personalidad</h3>
					<div class="form-group">
						<label for="newName">Nombre</label>
						<input 
							type="text" 
							id="newName" 
							bind:value={newPersonalityName}
							placeholder="Ej: Mi Asistente"
							onkeydown={(e) => e.key === 'Enter' && createPersonality()}
						/>
					</div>
					<div class="confirm-actions">
						<button type="button" class="btn-primary" onclick={createPersonality}>
							Crear
						</button>
						<button type="button" class="btn-secondary" onclick={closeCreateModal}>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Editor de personalidad seleccionada -->
		{#if selectedPersonality}
		<form onsubmit={(e) => { e.preventDefault(); savePersonality(); }}>
			<div class="form-section">
				<h3>✏️ Editando: {selectedPersonality.displayName || selectedPersonality.name}</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="name">Nombre {isFixedMode(selectedPersonality) ? '(bloqueado)' : ''}</label>
						<input
							type="text"
							id="name"
							bind:value={formName}
							placeholder="Ej: mi-asistente"
							disabled={isFixedMode(selectedPersonality)}
						/>
						<span class="hint">Identificador único</span>
					</div>

					<div class="form-group">
						<label for="displayName">Nombre de Display</label>
						<input
							type="text"
							id="displayName"
							bind:value={formDisplayName}
							placeholder="Ej: TorvaldsAI, Jarvis"
						/>
						<span class="hint">Nombre mostrado en la UI</span>
					</div>
				</div>

				<div class="form-group">
					<label for="description">Descripción Corta</label>
					<input
						type="text"
						id="description"
						bind:value={formDescription}
						placeholder="Ej: Asistente de arquitectura de software"
					/>
				</div>
			</div>

			<div class="form-section">
				<h3>🎨 Configuración de Respuestas</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="language">Idioma</label>
						<select id="language" bind:value={formLanguage}>
							<option value="es-AR">Español (Argentina)</option>
							<option value="es-ES">Español (España)</option>
							<option value="en-US">English (US)</option>
							<option value="pt-BR">Português (Brasil)</option>
						</select>
					</div>

					<div class="form-group">
						<label for="voiceStyle">Estilo de Voz</label>
						<select id="voiceStyle" bind:value={formVoiceStyle}>
							{#each voiceStyles as style}
								<option value={style.value}>{style.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label for="traits">Rasgos de Personalidad</label>
					<input
						type="text"
						id="traits"
						bind:value={formTraits}
						placeholder="directo, técnico, pragmático (separados por coma)"
					/>
					<span class="hint">Características que definen la personalidad</span>
				</div>
			</div>

			<div class="form-section">
				<h3>📝 System Prompt {isFixedMode(selectedPersonality) ? '(solo lectura)' : ''}</h3>

				<div class="variables-help">
					<details>
						<summary>📋 Variables disponibles para usar en prompts</summary>
						<div class="variables-content">
							<div class="variables-grid">
								<div class="var-group">
									<h5>👤 Owner (Dueño)</h5>
									<code>{'{'}{'{'} owner_name {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_first_name {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_last_name {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_role {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_role_short {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_location {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_email {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_bio {'}'}{'}'}}</code>
									<code>{'{'}{'{'} owner_philosophy {'}'}{'}'}}</code>
								</div>
								<div class="var-group">
									<h5>🤖 IA (Asistente)</h5>
									<code>{'{'}{'{'} ai_name {'}'}{'}'}}</code>
									<code>{'{'}{'{'} ai_command {'}'}{'}'}}</code>
									<code>{'{'}{'{'} ai_greeting {'}'}{'}'}}</code>
								</div>
								<div class="var-group">
									<h5>🌐 Sitio</h5>
									<code>{'{'}{'{'} site_title {'}'}{'}'}}</code>
									<code>{'{'}{'{'} site_description {'}'}{'}'}}</code>
								</div>
							</div>
							<p class="variables-note">💡 Las variables se reemplazan con los valores de <strong>General</strong></p>
						</div>
					</details>
				</div>

				<div class="form-group">
					<label for="systemPrompt">Instrucciones del Sistema</label>
					<textarea
						id="systemPrompt"
						bind:value={formSystemPrompt}
						rows={10}
						placeholder="Define las instrucciones y personalidad del agente..."
						disabled={isFixedMode(selectedPersonality)}
					></textarea>
					<span class="hint">
						{#if isFixedMode(selectedPersonality)}
							Los modos fijos tienen prompts predefinidos. Creá una personalidad personalizada para editar.
						{:else}
							Este prompt define cómo se comportará el agente.
						{/if}
					</span>
				</div>

				<div class="form-group">
					<label for="greeting">Saludo de esta Personalidad</label>
					<textarea
						id="greeting"
						bind:value={formGreeting}
						rows={2}
						placeholder={'Ej: ¡Buenas! Soy {{ai_name}}, preguntame sobre {{owner_name}}...'}
					></textarea>
					<span class="hint">Sobrescribe el saludo global para esta personalidad.</span>
				</div>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn-primary" disabled={saving}>
					{saving ? 'Guardando...' : '💾 Guardar Personalidad'}
				</button>
				<button type="button" class="btn-secondary" onclick={loadPersonalities}>
					↻ Recargar
				</button>
			</div>
		</form>
		{/if}
	{/if}
</div>

<style>
	.ai-config {
		width: 100%;
		max-width: 100%;
		padding: 0.25rem 0.5rem;
	}

	h2 {
		color: var(--theme-accent);
		margin-bottom: 1rem;
		font-size: 1.3rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--theme-accent);
	}

	h3 {
		color: var(--theme-accent);
		margin-bottom: 0.75rem;
		font-size: 0.95rem;
		border-bottom: 1px solid var(--theme-border);
		padding-bottom: 0.4rem;
	}

	.section-desc {
		color: var(--theme-text-muted);
		font-size: 0.8rem;
		margin: -0.5rem 0 1rem 0;
	}

	.form-section {
		background: var(--theme-bg-secondary);
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		border: 1px solid var(--theme-border);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-row.three-cols {
		grid-template-columns: 1fr 1fr 1fr;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	label {
		display: block;
		color: var(--theme-accent);
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
	}

	input, select, textarea {
		width: 100%;
		padding: 0.6rem;
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-border);
		border-radius: 4px;
		color: var(--theme-text-primary);
		font-family: 'Courier New', monospace;
		font-size: 0.85rem;
		transition: border-color 0.2s;
	}

	input:disabled, textarea:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	input:focus, select:focus, textarea:focus {
		outline: none;
		border-color: var(--theme-accent);
	}

	textarea {
		resize: vertical;
		min-height: 80px;
		line-height: 1.4;
	}

	.hint {
		display: block;
		color: var(--theme-text-muted);
		font-size: 0.75rem;
		margin-top: 0.3rem;
	}

	/* Personalities Grid */
	.personalities-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.personalities-header h3 {
		margin: 0;
		border: none;
		padding: 0;
	}

	.btn-create {
		padding: 0.4rem 0.8rem;
		background: transparent;
		border: 1px solid var(--theme-accent);
		color: var(--theme-accent);
		border-radius: 4px;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.btn-create:hover {
		background: var(--theme-accent-subtle);
	}

	.personalities-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.75rem;
	}

	.personality-card {
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-border);
		border-radius: 6px;
		padding: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		width: 100%;
	}

	.personality-card:hover {
		border-color: var(--theme-accent);
	}

	.personality-card.selected {
		border-color: var(--theme-warning);
		background: rgba(255, 149, 0, 0.08);
		box-shadow: 0 0 12px rgba(255, 149, 0, 0.3);
	}

	.personality-card.is-active {
		border-color: var(--theme-accent);
	}

	.personality-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.4rem;
	}

	.personality-icon {
		font-size: 1rem;
	}

	.personality-mode {
		color: var(--theme-text-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		flex: 1;
	}

	.personality-name-big {
		color: var(--theme-text-primary);
		font-weight: bold;
		font-size: 1rem;
		margin: 0.25rem 0 0.5rem;
	}

	.active-badge {
		background: var(--theme-accent);
		color: var(--theme-bg-primary);
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		font-size: 0.6rem;
		font-weight: bold;
	}

	.personality-desc {
		color: var(--theme-text-muted);
		font-size: 0.75rem;
		margin: 0 0 0.5rem;
		line-height: 1.3;
	}

	.personality-actions {
		display: flex;
		gap: 0.4rem;
	}

	.btn-activate {
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: 1px solid var(--theme-border-light);
		color: var(--theme-text-secondary);
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.7rem;
		transition: all 0.2s;
	}

	.btn-activate:hover {
		border-color: var(--theme-accent);
		color: var(--theme-accent);
	}

	.btn-delete {
		padding: 0.25rem 0.4rem;
		background: transparent;
		border: 1px solid var(--theme-danger);
		color: var(--theme-danger);
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.7rem;
		transition: all 0.2s;
	}

	.btn-delete:hover {
		background: rgba(255, 85, 85, 0.1);
	}

	/* Modal */
	.confirm-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 99999;
	}

	.confirm-modal {
		background: var(--theme-bg-primary);
		border: 2px solid var(--theme-accent);
		border-radius: 8px;
		padding: 1.5rem;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 0 30px var(--theme-accent-glow);
	}

	.confirm-modal h3 {
		margin-top: 0;
		border: none;
		color: var(--theme-accent);
	}

	.confirm-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	/* Buttons */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		padding-top: 0.5rem;
		margin-bottom: 1rem;
	}

	.form-actions-inline {
		margin-top: 0.75rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.6rem 1.2rem;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
		background: transparent;
		border: 1px solid var(--theme-accent);
		color: var(--theme-accent);
	}

	.btn-primary {
		font-weight: bold;
	}

	.btn-primary.btn-sm {
		padding: 0.4rem 0.8rem;
		font-size: 0.8rem;
	}

	.btn-primary:hover:not(:disabled),
	.btn-secondary:hover {
		background: var(--theme-accent-subtle);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Messages */
	.message {
		padding: 0.6rem 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.85rem;
	}

	.message.success {
		background: var(--theme-success-bg);
		border: 1px solid var(--theme-success);
		color: var(--theme-success);
	}

	.message.error {
		background: rgba(255, 85, 85, 0.1);
		border: 1px solid var(--theme-danger);
		color: var(--theme-danger);
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: var(--theme-text-muted);
	}

	/* Variables Help */
	.variables-help {
		margin-bottom: 1rem;
	}

	.variables-help details {
		background: var(--theme-accent-subtle);
		border: 1px solid var(--theme-border);
		border-radius: 4px;
	}

	.variables-help summary {
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		color: var(--theme-accent);
		font-size: 0.8rem;
	}

	.variables-content {
		padding: 0.75rem;
		border-top: 1px solid var(--theme-border);
	}

	.variables-grid {
		display: flex;
		gap: 1rem;
	}

	.var-group {
		background: var(--theme-bg-tertiary);
		padding: 0.5rem;
		border-radius: 4px;
		flex: 1;
	}

	.var-group h5 {
		color: var(--theme-text-muted);
		font-size: 0.7rem;
		margin-bottom: 0.3rem;
		font-weight: normal;
	}

	.var-group code {
		display: block;
		background: var(--theme-bg-primary);
		color: var(--theme-success);
		padding: 0.15rem 0.3rem;
		border-radius: 2px;
		font-size: 0.65rem;
		margin-bottom: 0.2rem;
	}

	.variables-note {
		margin: 0.75rem 0 0;
		padding-top: 0.5rem;
		border-top: 1px solid var(--theme-border);
		color: var(--theme-text-muted);
		font-size: 0.75rem;
	}

	@media (max-width: 768px) {
		.form-row, .form-row.three-cols {
			grid-template-columns: 1fr;
		}

		.personalities-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
