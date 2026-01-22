<script lang="ts">
    import '../app.css';
    import { onMount, type Snippet } from 'svelte';
    import { page } from '$app/stores';
    import { isTerminalVisible } from '../lib/stores/ui';
    import Terminal from '$lib/components/Terminal.svelte';
    import { startInChatMode } from '$lib/stores/terminal';
    import { portfolioConfig, aiPersonality, loadConfig } from '$lib/stores/config';
    import { initializeTheme } from '$lib/terminal/commands/theme';

    let { children }: { children: Snippet } = $props();

    // Verificar si estamos en una ruta de admin
    let isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));

    // Config dinámica
    let aiDisplayName = $derived($aiPersonality?.displayName || 'AI Assistant');
    let ownerName = $derived($portfolioConfig?.owner_name || 'Developer');
    let siteTitle = $derived($portfolioConfig?.branding_site_title || `${ownerName} - Portfolio`);
    let siteDescription = $derived($portfolioConfig?.branding_site_description || `Explora el portfolio de ${ownerName}`);

    onMount(() => {
        // Inicializar tema guardado
        initializeTheme();

        // Cargar configuración global
        loadConfig();

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
    <title>{siteTitle}</title>
    <meta
        name="description"
        content={siteDescription}
    />
    <meta name="author" content={ownerName} />
    <meta property="og:title" content={siteTitle} />
    <meta
        property="og:description"
        content={siteDescription}
    />
    <meta property="og:type" content="website" />
</svelte:head>


<main class="container-fluid font-monospace vh-100 d-flex flex-column overflow-hidden p-0">
    {@render children()}

    {#if !$isTerminalVisible && !isAdminRoute}
        <div class="fixed-bottom p-3 d-flex justify-content-end">
            <button 
                class="btn ai-button btn-outline-success shadow-lg" 
                style="background-color: var(--theme-bg-primary); backdrop-filter: blur(5px);"
                onclick={openTerminalWithAI}
            >
                <span class="me-2">⚡</span> Hablá con {aiDisplayName} (AI)
            </button>
        </div>
    {/if}
</main>

{#if $isTerminalVisible && !isAdminRoute}
    <Terminal />
{/if}

<style>
    .ai-button {
        z-index: 1050;
    }
</style>