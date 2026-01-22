<script lang="ts">
	import { onMount } from 'svelte';

	interface AiPersonality {
		id: number;
		name: string;
		displayName: string;
		description: string;
		systemPrompt: string;
		greeting: string | null;
		traits: string[] | null;
		language: string;
		voiceStyle: string | null;
		active: boolean;
	}

	let personality: AiPersonality | null = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let message = $state('');
	let messageType: 'success' | 'error' = $state('success');

	// Form state
	let formName = $state('');
	let formDisplayName = $state('');
	let formDescription = $state('');
	let formSystemPrompt = $state('');
	let formGreeting = $state('');
	let formTraits = $state('');
	let formLanguage = $state('es-AR');
	let formVoiceStyle = $state('technical');

	const availableModes = [
		{
			value: 'arquitecto',
			label: '🏗️ Arquitecto de Software',
			prompt: 'Sos el arquitecto de software personal. Analizás proyectos con ojo crítico, mentalidad de escalabilidad empresarial.'
		},
		{
			value: 'debugger',
			label: '🐛 Debugger',
			prompt: 'Sos el debugger personal. Tu único objetivo es encontrar la causa raíz de errores. Pedís stack traces, logs, y hacés preguntas precisas.'
		},
		{
			value: 'documentador',
			label: '📝 Documentador',
			prompt: 'Sos el technical writer personal. Generás documentación clara y profesional: READMEs, arquitectura, APIs. Seguís el principio "docs-as-code".'
		},
		{
			value: 'mentor',
			label: '🎓 Mentor',
			prompt: 'Sos un mentor de programación paciente y didáctico. Explicás conceptos de manera simple, usás ejemplos prácticos y guiás paso a paso.'
		},
		{ value: 'custom', label: '⚙️ Personalizado', prompt: '' }
	];

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
		await loadPersonality();
	});

	async function loadPersonality() {
		loading = true;
		try {
			const response = await fetch('/api/ai-personalities/active', {
				credentials: 'include'
			});
			if (response.ok) {
				const data = await response.json();
				if (data) {
					personality = data;
					// Populate form
					formName = data.name || '';
					formDisplayName = data.displayName || '';
					formDescription = data.description || '';
					formSystemPrompt = data.systemPrompt || '';
					formGreeting = data.greeting || '';
					formTraits = data.traits?.join(', ') || '';
					formLanguage = data.language || 'es-AR';
					formVoiceStyle = data.voiceStyle || 'technical';
				}
			}
		} catch (error) {
			console.error('Error loading AI personality:', error);
		} finally {
			loading = false;
		}
	}

	async function savePersonality() {
		saving = true;
		message = '';

		try {
			const payload = {
				slug: formName.toLowerCase().replace(/\s+/g, '-'),
				name: formName,
				displayName: formDisplayName,
				description: formDescription,
				systemPrompt: formSystemPrompt,
				greeting: formGreeting || null,
				traits: formTraits ? formTraits.split(',').map((t) => t.trim()) : null,
				language: formLanguage,
				voiceStyle: formVoiceStyle
			};

			const response = await fetch('/api/ai-personalities/active', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(payload)
			});

			if (response.ok) {
				message = '✓ Personalidad de IA actualizada correctamente';
				messageType = 'success';
				await loadPersonality();
			} else {
				throw new Error('Error al guardar');
			}
		} catch (error) {
			message = '✗ Error al guardar la configuración';
			messageType = 'error';
		} finally {
			saving = false;
		}
	}

	function applyModeTemplate(mode: string) {
		const template = availableModes.find((m) => m.value === mode);
		if (template && template.prompt) {
			formSystemPrompt = template.prompt;
		}
	}
</script>

<div class="ai-config">
	<h2>🤖 Configuración de IA & Personalidad</h2>

	{#if loading}
		<div class="loading">Cargando configuración...</div>
	{:else}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				savePersonality();
			}}
		>
			<div class="form-section">
				<h3>Identidad del Agente</h3>

				<div class="form-row">
					<div class="form-group">
						<label for="name">Slug (interno)</label>
						<input
							type="text"
							id="name"
							bind:value={formName}
							placeholder="Ej: torvalds, jarvis"
						/>
						<span class="hint">Identificador único sin espacios</span>
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
				<h3>Modo de Comportamiento</h3>

				<div class="mode-buttons">
					{#each availableModes as mode}
						<button
							type="button"
							class="mode-btn"
							onclick={() => applyModeTemplate(mode.value)}
						>
							{mode.label}
						</button>
					{/each}
				</div>

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
				<h3>System Prompt</h3>

				<div class="variables-help">
					<details>
						<summary>📋 Variables disponibles para usar en prompts y saludos</summary>
						<div class="variables-content">
							<p>Usá estas variables con doble llave <code>{'{{'}</code>variable<code>{'}}'}</code> y se reemplazarán automáticamente:</p>
							<div class="variables-grid">
								<div class="var-group">
									<h5>👤 Owner</h5>
									<code>{'{{owner_name}}'}</code>
									<code>{'{{owner_first_name}}'}</code>
									<code>{'{{owner_last_name}}'}</code>
									<code>{'{{owner_role}}'}</code>
									<code>{'{{owner_role_short}}'}</code>
									<code>{'{{owner_location}}'}</code>
									<code>{'{{owner_philosophy}}'}</code>
								</div>
								<div class="var-group">
									<h5>📧 Contacto</h5>
									<code>{'{{owner_email}}'}</code>
									<code>{'{{owner_email_alt}}'}</code>
									<code>{'{{contact_availability}}'}</code>
									<code>{'{{contact_cta}}'}</code>
								</div>
								<div class="var-group">
									<h5>🔗 Social</h5>
									<code>{'{{github_url}}'}</code>
									<code>{'{{github_username}}'}</code>
									<code>{'{{linkedin_url}}'}</code>
								</div>
								<div class="var-group">
									<h5>🤖 IA</h5>
									<code>{'{{ai_name}}'}</code>
									<code>{'{{ai_command}}'}</code>
									<code>{'{{ai_greeting}}'}</code>
								</div>
							</div>
						</div>
					</details>
				</div>

				<div class="form-group">
					<label for="systemPrompt">Instrucciones del Sistema</label>
					<textarea
						id="systemPrompt"
						bind:value={formSystemPrompt}
						rows={12}
						placeholder="Define las instrucciones y personalidad del agente..."
					></textarea>
					<span class="hint">
						Este prompt define cómo se comportará el agente. Incluye contexto,
						restricciones y estilo de respuesta. Podés usar las variables de arriba.
					</span>
				</div>

				<div class="form-group">
					<label for="greeting">Saludo Inicial (opcional)</label>
					<textarea
						id="greeting"
						bind:value={formGreeting}
						rows={3}
						placeholder="Ej: ¡Buenas! Soy {{ai_name}}, el asistente de {{owner_name}}..."
					></textarea>
					<span class="hint">
						Mensaje que se muestra al activar el agente. Usa <code>{'{{ai_name}}'}</code> y <code>{'{{owner_name}}'}</code> para personalizar.
					</span>
				</div>
			</div>

			{#if message}
				<div class="message {messageType}">{message}</div>
			{/if}

			<div class="form-actions">
				<button type="submit" class="btn-primary" disabled={saving}>
					{saving ? 'Guardando...' : '💾 Guardar Cambios'}
				</button>
				<button type="button" class="btn-secondary" onclick={loadPersonality}>
					↻ Recargar
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.ai-config {
		max-width: 900px;
		padding-bottom: 2rem;
	}

	h2 {
		color: #00ff00;
		margin-bottom: 1.5rem;
		font-size: 1.4rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #00ff00;
	}

	h3 {
		color: #00ff00;
		margin-bottom: 1rem;
		font-size: 1rem;
		border-bottom: 1px solid #333;
		padding-bottom: 0.5rem;
	}

	.form-section {
		background: #0d0d1a;
		padding: 1.5rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		border: 1px solid #333;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	label {
		display: block;
		color: #00ff00;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 0.75rem;
		background: #1a1a2e;
		border: 1px solid #333;
		border-radius: 4px;
		color: #e0e0e0;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		transition: border-color 0.2s;
	}

	input:focus,
	select:focus,
	textarea:focus {
		outline: none;
		border-color: #00ff00;
	}

	textarea {
		resize: vertical;
		min-height: 100px;
		line-height: 1.5;
	}

	select {
		cursor: pointer;
	}

	.hint {
		display: block;
		color: #666;
		font-size: 0.8rem;
		margin-top: 0.4rem;
	}

	.mode-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.mode-btn {
		padding: 0.5rem 1rem;
		background: #1a1a2e;
		border: 1px solid #444;
		border-radius: 4px;
		color: #aaa;
		font-family: 'Courier New', monospace;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mode-btn:hover {
		border-color: #00ff00;
		color: #00ff00;
	}

	.message {
		padding: 0.75rem 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.message.success {
		background: rgba(80, 250, 123, 0.1);
		border: 1px solid #50fa7b;
		color: #50fa7b;
	}

	.message.error {
		background: rgba(255, 85, 85, 0.1);
		border: 1px solid #ff5555;
		color: #ff5555;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		padding-top: 1rem;
		margin-bottom: 2rem;
	}

	.btn-primary,
	.btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #00ff00;
		border: none;
		color: #0d0d1a;
		font-weight: bold;
	}

	.btn-primary:hover:not(:disabled) {
		background: #00cc00;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid #00ff00;
		color: #00ff00;
	}

	.btn-secondary:hover {
		background: rgba(0, 255, 0, 0.1);
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #888;
	}

	/* Variables Help Panel */
	.variables-help {
		margin-bottom: 1.5rem;
	}

	.variables-help details {
		background: rgba(0, 255, 0, 0.05);
		border: 1px solid #333;
		border-radius: 4px;
	}

	.variables-help summary {
		padding: 0.75rem 1rem;
		cursor: pointer;
		color: #00ff00;
		font-size: 0.9rem;
		user-select: none;
	}

	.variables-help summary:hover {
		background: rgba(0, 255, 0, 0.1);
	}

	.variables-content {
		padding: 1rem;
		border-top: 1px solid #333;
	}

	.variables-content p {
		color: #aaa;
		font-size: 0.85rem;
		margin-bottom: 1rem;
	}

	.variables-content p code {
		background: #222;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		color: #00ff00;
	}

	.variables-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.var-group {
		background: #1a1a2e;
		padding: 0.75rem;
		border-radius: 4px;
	}

	.var-group h5 {
		color: #888;
		font-size: 0.8rem;
		margin-bottom: 0.5rem;
		font-weight: normal;
	}

	.var-group code {
		display: block;
		background: #0d0d1a;
		color: #50fa7b;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.75rem;
		margin-bottom: 0.25rem;
		font-family: 'Courier New', monospace;
	}

	@media (max-width: 600px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
