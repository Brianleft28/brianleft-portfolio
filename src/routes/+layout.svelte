<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { isTerminalVisible } from '../lib/stores/ui';
	import Terminal from '$lib/components/Terminal.svelte';
	import { startInChatMode } from '$lib/stores/terminal';

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.ctrlKey && (event.key === 'ñ' || event.key === 'Ñ')) {
				event.preventDefault();
				isTerminalVisible.update((visible) => {
					const newVisible = !visible;
					console.log(`[DEBUG] Terminal visibility toggled: ${newVisible}`);
					return newVisible;
				});
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	function openTerminalWithAI() {
		startInChatMode.set(true);
		isTerminalVisible.set(true);
	}
</script>

<svelte:head>
	<title>brianbenegas.js</title>
	<meta
		name="description"
		content="Explora el portfolio de Brian Benegas, un desarrollador de software especializado en la creación de aplicaciones web robustas y escalables con tecnologías como SvelteKit, Nest.js y Docker."
	/>
	<meta name="author" content="Brian Benegas" />
	<meta property="og:title" content="Brian Benegas - Portfolio" />
	<meta
		property="og:description"
		content="Un vistazo a los proyectos, habilidades y experiencia de Brian Benegas."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://brianleft.com" />
	<meta property="og:image" content="https://brianleft.com/social-preview.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Portfolio BB" />
	<meta
		name="twitter:description"
		content="Explora los proyectos y la experiencia de Brian Benegas."
	/>
</svelte:head>

<main class="container-fluid font-monospace vh-100 d-flex flex-column overflow-hidden p-0">
	<slot />

	{#if !$isTerminalVisible}
		<div class="fixed-bottom p-3 d-flex justify-content-end">
			<button
				class="btn ai-button btn-dark border border-success text-success shadow-lg"
				style="background-color: rgba(0,0,0,0.8);"
				on:click={openTerminalWithAI}
			>
				<span class="me-2">⚡</span> Hablá con mi asistente Torvalds (AI)
			</button>
		</div>
	{/if}
</main>

{#if $isTerminalVisible}
	<Terminal />
{/if}

<style>
	.ai-button {
		z-index: 1050;
	}
</style>
