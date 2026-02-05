<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { _ } from 'svelte-i18n';

	export let form: ActionData;
</script>

<svelte:head>
	<title>Login - Admin | Portfolio</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<header class="login-header">
			<div class="login-icon">🔐</div>
			<h1>admin_login.exe</h1>
			<p class="login-subtitle">{$_('admin.login.username')} / {$_('admin.login.password')}</p>
		</header>

		{#if form?.error}
			<div class="login-error" role="alert">
				<span class="error-icon">❌</span>
				<span>{form.error}</span>
			</div>
		{/if}

		<form method="POST" use:enhance class="login-form">
			<div class="form-field">
				<label for="username">
					<span class="field-icon">👤</span>
					{$_('admin.login.username')}
				</label>
				<input
					type="text"
					id="username"
					name="username"
					required
					autocomplete="username"
					placeholder="user@domain"
				/>
			</div>

			<div class="form-field">
				<label for="password">
					<span class="field-icon">🔑</span>
					{$_('admin.login.password')}
				</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					autocomplete="current-password"
					placeholder="••••••••"
				/>
			</div>

			<button type="submit" class="login-btn">
				<span>🚀</span> {$_('admin.login.submit')}
			</button>
		</form>

		<footer class="login-footer">
			<a href="/">← {$_('admin.login.back_to_portfolio')}</a>
		</footer>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--theme-bg-primary);
		padding: 1rem;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		background: var(--theme-bg-secondary);
		border: 1px solid var(--theme-accent);
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 0 30px var(--theme-accent-glow);
	}

	.login-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--theme-border);
	}

	.login-icon {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.login-header h1 {
		color: var(--theme-accent);
		font-size: 1.4rem;
		font-weight: 700;
		margin: 0;
	}

	.login-subtitle {
		color: var(--theme-text-secondary);
		font-size: 0.85rem;
		margin: 0.5rem 0 0;
	}

	.login-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 85, 85, 0.1);
		border: 1px solid var(--theme-error);
		border-radius: 6px;
		color: var(--theme-error);
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}

	.error-icon {
		flex-shrink: 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.form-field label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--theme-text-primary);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.field-icon {
		font-size: 0.85rem;
	}

	.form-field input {
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-border);
		border-radius: 6px;
		padding: 0.75rem 1rem;
		color: var(--theme-text-primary);
		font-family: inherit;
		font-size: 0.95rem;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.form-field input:focus {
		outline: none;
		border-color: var(--theme-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-accent) 25%, transparent);
	}

	.form-field input::placeholder {
		color: var(--theme-text-muted);
	}

	.login-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem 1.5rem;
		margin-top: 0.5rem;
		background: transparent;
		border: 1px solid var(--theme-accent);
		border-radius: 6px;
		color: var(--theme-accent);
		font-family: inherit;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.login-btn:hover {
		background: var(--theme-accent);
		color: var(--theme-bg-primary);
		box-shadow: 0 0 15px var(--theme-accent-glow);
	}

	.login-btn:active {
		transform: translateY(1px);
	}

	.login-footer {
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--theme-border);
		text-align: center;
	}

	.login-footer a {
		color: var(--theme-text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s;
	}

	.login-footer a:hover {
		color: var(--theme-accent);
	}

	@media (max-width: 480px) {
		.login-card {
			padding: 1.5rem;
		}

		.login-icon {
			font-size: 2rem;
		}

		.login-header h1 {
			font-size: 1.2rem;
		}
	}
</style>
