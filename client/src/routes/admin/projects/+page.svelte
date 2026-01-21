<script lang="ts">
	import ProjectLoader from '$lib/components/ProjectLoader.svelte';
</script>

<svelte:head>
	<title>Admin - Cargar Proyecto | Portfolio</title>
</svelte:head>

<div class="admin-page">
	<nav class="admin-nav">
		<a href="/">← Volver al Portfolio</a>
	</nav>
	
	<ProjectLoader />
</div>

<style>
	.admin-page {
		height: 100vh;
		background: var(--bg-primary, #121212);
		padding: 1.5rem 2rem;
		overflow-y: auto;
	}

	.admin-nav {
		margin-bottom: 1.5rem;
	}

	.admin-nav a {
		color: var(--accent-color, #007acc);
		text-decoration: none;
	}

	.admin-nav a:hover {
		text-decoration: underline;
	}
</style>
