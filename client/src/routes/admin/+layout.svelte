<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const isLoginPage = $derived($page.url.pathname === '/admin/login');
</script>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="admin-overlay">
		<div class="admin-container">
			<div class="admin-header">
				<div class="header-info">
					<span class="header-icon">⚙️</span>
					<span class="header-title">Panel de Administración</span>
				</div>
				<div class="header-actions">
					<a href="/" class="nav-link">← Volver al sitio</a>
					<a href="/admin/logout" class="logout-btn">Cerrar sesión</a>
				</div>
			</div>

			<div class="admin-content">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.admin-overlay {
		height: 100dvh;
		background: var(--theme-bg-primary);
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem;
		box-sizing: border-box;
	}

	.admin-container {
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-accent);
		border-radius: 8px;
		width: 100%;
		max-width: 1200px;
		height: calc(100dvh - 3rem);
		display: flex;
		flex-direction: column;
		box-shadow:
			0 0 20px var(--theme-accent-glow),
			inset 0 0 60px var(--theme-accent-subtle);
		overflow: hidden;
	}

	.admin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--theme-bg-secondary);
		border-bottom: 1px solid var(--theme-accent);
		border-radius: 8px 8px 0 0;
		flex-shrink: 0;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-icon {
		font-size: 1.2rem;
	}

	.header-title {
		color: var(--theme-accent);
		font-family: 'Courier New', monospace;
		font-size: 1rem;
		font-weight: bold;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		color: var(--theme-accent);
		text-decoration: none;
		font-family: 'Courier New', monospace;
		font-size: 0.85rem;
		transition: opacity 0.2s;
	}

	.nav-link:hover {
		opacity: 0.8;
	}

	.logout-btn {
		background: transparent;
		border: 1px solid var(--theme-danger);
		color: var(--theme-danger);
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: var(--theme-danger);
		color: var(--theme-bg-primary);
	}

	.admin-content {
		flex: 1;
		min-height: 0;
		padding: 1.5rem;
		overflow-y: auto;
		overflow-x: hidden;
		color: var(--theme-text-primary);
		font-family: 'Courier New', monospace;
		background: var(--theme-bg-primary);
		scrollbar-width: thin;
		scrollbar-color: var(--theme-accent) var(--theme-bg-secondary);
	}

	/* Scrollbar estilo FileViewer - WebKit */
	.admin-content::-webkit-scrollbar {
		width: 12px;
	}

	.admin-content::-webkit-scrollbar-track {
		background: var(--theme-bg-secondary);
		border-left: 1px solid var(--theme-border);
	}

	.admin-content::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, var(--theme-accent) 0%, var(--theme-accent-alt) 100%);
		border-radius: 6px;
		border: 3px solid var(--theme-bg-secondary);
	}

	.admin-content::-webkit-scrollbar-thumb:hover {
		background: var(--theme-accent);
	}

	.admin-content::-webkit-scrollbar-corner {
		background: var(--theme-bg-secondary);
	}
</style>
