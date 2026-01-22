<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { children } = $props();

	let activeTab = $derived.by(() => {
		const path = $page.url.pathname;
		if (path === '/admin/login') return 'login';
		if (path.includes('/ai')) return 'ai';
		if (path.includes('/projects')) return 'projects';
		if (path.includes('/uploads')) return 'uploads';
		return 'general';
	});

	const isLoginPage = $derived($page.url.pathname === '/admin/login');

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		} catch (e) {
			// Ignorar errores de logout
		}
		goto('/admin/login');
	}
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
					<button class="logout-btn" onclick={handleLogout}>Cerrar sesión</button>
				</div>
			</div>

			<div class="admin-nav">
				<a href="/admin/settings" class="nav-tab" class:active={activeTab === 'general'}>
					🏠 General
				</a>
				<a href="/admin/ai" class="nav-tab" class:active={activeTab === 'ai'}>
					🤖 IA & Personalidad
				</a>
				<a href="/admin/projects" class="nav-tab" class:active={activeTab === 'projects'}>
					📁 Proyectos
				</a>
				<a href="/admin/uploads" class="nav-tab" class:active={activeTab === 'uploads'}>
					📤 Archivos
				</a>
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
		background: #0a0a0f;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1.5rem;
		box-sizing: border-box;
	}

	.admin-container {
		background: #1a1a2e;
		border: 1px solid #00ff00;
		border-radius: 8px;
		width: 100%;
		max-width: 1200px;
		height: calc(100dvh - 3rem);
		display: flex;
		flex-direction: column;
		box-shadow:
			0 0 20px rgba(0, 255, 0, 0.3),
			inset 0 0 60px rgba(0, 255, 0, 0.05);
		overflow: hidden;
	}

	.admin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #0d0d1a;
		border-bottom: 1px solid #00ff00;
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
		color: #00ff00;
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
		color: #00ff00;
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
		border: 1px solid #ff5555;
		color: #ff5555;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: #ff5555;
		color: #0d0d1a;
	}

	.admin-nav {
		display: flex;
		background: #0d0d1a;
		border-bottom: 1px solid #333;
		overflow-x: auto;
		flex-shrink: 0;
	}

	.nav-tab {
		padding: 0.75rem 1.5rem;
		color: #888;
		text-decoration: none;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.nav-tab:hover {
		color: #00ff00;
		background: rgba(0, 255, 0, 0.05);
	}

	.nav-tab.active {
		color: #00ff00;
		border-bottom-color: #00ff00;
		background: rgba(0, 255, 0, 0.1);
	}

	.admin-content {
		flex: 1;
		min-height: 0;
		padding: 1.5rem;
		overflow-y: auto;
		overflow-x: hidden;
		color: #e0e0e0;
		font-family: 'Courier New', monospace;
		background: #161622;
		scrollbar-width: thin;
		scrollbar-color: #00ff00 #0d0d1a;
	}

	/* Scrollbar estilo FileViewer - WebKit */
	.admin-content::-webkit-scrollbar {
		width: 12px;
	}

	.admin-content::-webkit-scrollbar-track {
		background: #0d0d1a;
		border-left: 1px solid #222;
	}

	.admin-content::-webkit-scrollbar-thumb {
		background: linear-gradient(180deg, #00ff00 0%, #00cc00 100%);
		border-radius: 6px;
		border: 3px solid #0d0d1a;
	}

	.admin-content::-webkit-scrollbar-thumb:hover {
		background: linear-gradient(180deg, #00ff00 0%, #00aa00 100%);
	}

	.admin-content::-webkit-scrollbar-corner {
		background: #0d0d1a;
	}
</style>
