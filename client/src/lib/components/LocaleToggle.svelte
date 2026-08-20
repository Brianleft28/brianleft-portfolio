<script lang="ts">
	import { locale } from 'svelte-i18n';
	import { setLocale } from '$lib/i18n';

	function toggleLocale() {
		setLocale($locale === 'es' ? 'en' : 'es');
	}
</script>

<button
	class="locale-toggle"
	onclick={toggleLocale}
	title={$locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
>
	{$locale === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}
</button>

<style>
	.locale-toggle {
		background: var(--theme-bg-secondary);
		border: 1px solid var(--theme-border);
		color: var(--theme-text-primary);
		padding: 0.3rem 0.6rem;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.locale-toggle:hover {
		background: var(--theme-accent-subtle);
		border-color: var(--theme-accent);
		color: var(--theme-accent);
	}
</style>
