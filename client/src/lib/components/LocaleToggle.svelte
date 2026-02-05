<script lang="ts">
	import { locale } from 'svelte-i18n';

	function toggleLocale() {
		const newLocale = $locale === 'es' ? 'en' : 'es';
		locale.set(newLocale);
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('portfolio-locale', newLocale);
		}
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
