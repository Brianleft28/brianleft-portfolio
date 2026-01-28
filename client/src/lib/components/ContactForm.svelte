<script lang="ts">
	import { portfolioConfig } from '$lib/stores/config';

	let name = $state('');
	let email = $state('');
	let subject = $state('');
	let message = $state('');
	let isSubmitting = $state(false);
	let submitResult = $state<{ success: boolean; message: string } | null>(null);

	const ownerName = $derived($portfolioConfig?.owner_name || 'Developer');
	const ownerEmail = $derived($portfolioConfig?.owner_email || $portfolioConfig?.contact_email_primary || '');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		
		if (!name.trim() || !email.trim() || !message.trim()) {
			submitResult = { success: false, message: 'Por favor completa todos los campos requeridos' };
			return;
		}

		if (!email.includes('@') || !email.includes('.')) {
			submitResult = { success: false, message: 'Por favor ingresa un email válido' };
			return;
		}

		isSubmitting = true;
		submitResult = null;

		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					subject: subject.trim() || `Mensaje de ${name.trim()}`,
					message: message.trim()
				})
			});

			const data = await response.json();

			if (response.ok) {
				submitResult = { success: true, message: '✅ Mensaje enviado correctamente!' };
				name = '';
				email = '';
				subject = '';
				message = '';
			} else {
				submitResult = { success: false, message: data.message || 'Error al enviar el mensaje' };
			}
		} catch (error) {
			submitResult = { success: false, message: 'Error de conexión. Intenta de nuevo.' };
		} finally {
			isSubmitting = false;
		}
	}

	function clearResult() {
		submitResult = null;
	}
</script>

<article class="contact-form-wrapper">
	<header class="contact-header">
		<div class="contact-icon">📧</div>
		<h1>contacto.exe</h1>
		<p class="subtitle">Enviar mensaje a {ownerName}</p>
	</header>

	<form class="contact-form" onsubmit={handleSubmit}>
		<div class="form-group">
			<label for="contact-name">
				<span class="icon">👤</span> Nombre <span class="required">*</span>
			</label>
			<input
				id="contact-name"
				type="text"
				bind:value={name}
				placeholder="Tu nombre"
				disabled={isSubmitting}
				onfocus={clearResult}
			/>
		</div>

		<div class="form-group">
			<label for="contact-email">
				<span class="icon">📬</span> Email <span class="required">*</span>
			</label>
			<input
				id="contact-email"
				type="email"
				bind:value={email}
				placeholder="tu@email.com"
				disabled={isSubmitting}
				onfocus={clearResult}
			/>
		</div>

		<div class="form-group">
			<label for="contact-subject">
				<span class="icon">📋</span> Asunto
			</label>
			<input
				id="contact-subject"
				type="text"
				bind:value={subject}
				placeholder="Asunto del mensaje (opcional)"
				disabled={isSubmitting}
				onfocus={clearResult}
			/>
		</div>

		<div class="form-group">
			<label for="contact-message">
				<span class="icon">💬</span> Mensaje <span class="required">*</span>
			</label>
			<textarea
				id="contact-message"
				bind:value={message}
				placeholder="Escribe tu mensaje aquí..."
				rows="5"
				disabled={isSubmitting}
				onfocus={clearResult}
			></textarea>
		</div>

		{#if submitResult}
			<div class="result-message" class:success={submitResult.success} class:error={!submitResult.success}>
				{submitResult.message}
			</div>
		{/if}

		<button type="submit" class="submit-btn" disabled={isSubmitting}>
			{#if isSubmitting}
				<span class="spinner">⏳</span> Enviando...
			{:else}
				<span>🚀</span> Enviar mensaje
			{/if}
		</button>
	</form>

	<footer class="contact-footer">
		<p>Los mensajes se envían directamente a <strong>{ownerEmail || ownerName}</strong></p>
	</footer>
</article>

<style>
	/* Usa las mismas variables CSS que FileViewer */
	.contact-form-wrapper {
		padding: 1.5rem 2rem;
		color: var(--theme-text-primary);
		line-height: 1.7;
		background: transparent;
		max-width: 600px;
		margin: 0 auto;
	}

	.contact-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--theme-accent);
	}

	.contact-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.contact-header h1 {
		color: var(--theme-text-bright);
		font-size: 1.6rem;
		font-weight: 700;
		margin: 0;
		font-family: 'Consolas', 'Monaco', monospace;
	}

	.subtitle {
		color: var(--theme-text-secondary);
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}

	.contact-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-group label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: var(--theme-text-primary);
		font-weight: 600;
	}

	.icon {
		font-size: 0.9rem;
	}

	.required {
		color: var(--theme-error, #ff6b6b);
	}

	.form-group input,
	.form-group textarea {
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-border);
		border-radius: 6px;
		padding: 0.75rem 1rem;
		color: var(--theme-text-primary);
		font-family: inherit;
		font-size: 0.95rem;
		transition: border-color 0.2s, box-shadow 0.2s;
		width: 100%;
		box-sizing: border-box;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--theme-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 20%, transparent);
	}

	.form-group input::placeholder,
	.form-group textarea::placeholder {
		color: var(--theme-text-muted, #666);
	}

	.form-group input:disabled,
	.form-group textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.result-message {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;
		text-align: center;
	}

	.result-message.success {
		background: color-mix(in srgb, var(--theme-success, #00ff00) 15%, transparent);
		border: 1px solid var(--theme-success, #00ff00);
		color: var(--theme-success, #00ff00);
	}

	.result-message.error {
		background: color-mix(in srgb, var(--theme-error, #ff4444) 15%, transparent);
		border: 1px solid var(--theme-error, #ff4444);
		color: var(--theme-error, #ff6666);
	}

	.submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		background: transparent;
		color: var(--theme-accent);
		border: 1px solid var(--theme-accent);
		border-radius: 6px;
		padding: 0.875rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
		transform: translateY(-1px);
	}

	.submit-btn:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		animation: spin 1s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.contact-footer {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--theme-border);
		text-align: center;
	}

	.contact-footer p {
		color: var(--theme-text-muted, #666);
		font-size: 0.8rem;
		margin: 0;
	}

	.contact-footer strong {
		color: var(--theme-accent);
	}

	@media (max-width: 600px) {
		.contact-form-wrapper {
			padding: 1rem;
		}

		.contact-icon {
			font-size: 2rem;
		}

		.contact-header h1 {
			font-size: 1.25rem;
		}
	}
</style>
