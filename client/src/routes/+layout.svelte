<script lang="ts">
    import '../app.css';
    import '$lib/i18n';
    import { onMount, untrack, type Snippet } from 'svelte';
    import { page } from '$app/stores';
    import { isTerminalVisible } from '../lib/stores/ui';
    import Terminal from '$lib/components/Terminal.svelte';
    import { startInChatMode } from '$lib/stores/terminal';
    import {
        portfolioConfig,
        aiPersonality,
        loadConfig,
        loadFilesystem,
        dynamicFilesystem,
        type FileSystemNode
    } from '$lib/stores/config';
    import { initializeTheme } from '$lib/terminal/commands/theme';
    import { t, locale } from 'svelte-i18n';

    let { children, data }: {
        children: Snippet;
        data: { locale?: string; settings?: Record<string, string>; filesystem?: FileSystemNode[] };
    } = $props();

    // Settings resueltos en el server (SSR). El store del cliente arranca con los
    // defaults ("Developer"), así que hasta que loadConfig() termine usamos estos
    // para que el <title>/og: del HTML crudo ya traigan la identidad real.
    const ssr = $derived(data?.settings ?? {});

    // Se siembra el árbol acá y no en `onMount` a propósito: esto corre también
    // durante el render del servidor, así que el contenido viaja dentro del HTML.
    // En `onMount` llegaría tarde para cualquiera que no ejecute JavaScript.
    // `untrack` porque acá el valor inicial es justamente lo que se quiere: es
    // la semilla del render. Los cambios posteriores los maneja `loadFilesystem`.
    untrack(() => {
        if (data?.filesystem?.length) dynamicFilesystem.set(data.filesystem);
    });

    // Verificar si estamos en una ruta de admin
    let isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));

    // Config dinámica
    let aiDisplayName = $derived($aiPersonality?.displayName || 'AI Assistant');
    // El store default ya vale 'Developer', por eso no alcanza con `||`: mientras
    // no esté `_loaded`, la fuente de verdad son los settings del SSR.
    let loaded = $derived($portfolioConfig?._loaded === true);
    let ownerName = $derived(
        (loaded ? $portfolioConfig?.owner_name : ssr.owner_name) || 'Developer'
    );
    let siteTitle = $derived(
        (loaded ? $portfolioConfig?.branding_site_title : ssr.branding_site_title) ||
            `${ownerName} - Portfolio`
    );
    let siteDescription = $derived(
        (loaded ? $portfolioConfig?.branding_site_description : ssr.branding_site_description) ||
            `Explora el portfolio de ${ownerName}`
    );
    let ownerRole = $derived((loaded ? $portfolioConfig?.owner_role : ssr.owner_role) || '');

    // SEO por página: las rutas que lo devuelven (p. ej. /proyectos/[slug]) mandan
    // su propio título/description/og:type. `<svelte:head>` NO deduplica, así que
    // el meta se centraliza acá: una sola fuente para toda la app, y las páginas
    // sólo sobreescriben estos campos vía `data.seo`.
    let seo = $derived(
        $page.data?.seo as { title?: string; description?: string; type?: string } | undefined
    );

    /**
     * El `<title>` de una home personal es nombre + rol: es lo que se ve en el
     * resultado de Google y lo único por lo que alguien busca a una persona.
     * `branding_site_title` es el nombre del sitio, así que va en `og:site_name`,
     * que es la etiqueta que existe justamente para eso.
     */
    let pageTitle = $derived(
        seo?.title || (ownerRole ? `${ownerName} — ${ownerRole}` : siteTitle)
    );
    // Description efectiva: la de la página si la hay, si no la del sitio.
    let pageDescription = $derived(seo?.description || siteDescription);

    // `social_website` es la URL pública parametrizada. Se prefiere al origin de
    // la request porque detrás del proxy el server puede ver `localhost`.
    let siteUrl = $derived(
        ((loaded ? $portfolioConfig?.social_website : ssr.social_website) || $page.url.origin).replace(/\/$/, '')
    );
    let canonical = $derived(siteUrl + $page.url.pathname.replace(/\/$/, '') || siteUrl);
    let socialImage = $derived(`${siteUrl}/social-preview.png`);
    let githubUrl = $derived((loaded ? $portfolioConfig?.social_github : ssr.social_github) || '');
    let linkedinUrl = $derived((loaded ? $portfolioConfig?.social_linkedin : ssr.social_linkedin) || '');

    /**
     * Datos estructurados: es lo que le permite a Google entender que el sitio
     * es *una persona* con un oficio, y no una página cualquiera. Sin esto no
     * hay forma de que aparezca un panel al buscar el nombre.
     */
    let personJsonLd = $derived(
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: ownerName,
            jobTitle: ownerRole || undefined,
            url: siteUrl,
            image: socialImage,
            description: siteDescription,
            sameAs: [githubUrl, linkedinUrl].filter(Boolean)
        })
    );

    onMount(() => {
        // Inicializar tema guardado
        initializeTheme();

        // Cargar configuración global
        loadConfig();

        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl+Ñ es el atajo histórico, pero la Ñ no existe en teclados no
            // españoles. Ctrl+K es el alias universal (convención de command
            // palettes) para que un visitante de afuera también pueda abrir la
            // consola sin depender del botón flotante.
            const key = event.key.toLowerCase();
            if (event.ctrlKey && (key === 'ñ' || key === 'k')) {
                event.preventDefault();
                isTerminalVisible.update((visible) => !visible);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // El contenido del filesystem viene traducido desde la API: al cambiar de
        // idioma hay que volver a pedirlo. `loadFilesystem` cachea por idioma, así
        // que el disparo inicial de la suscripción no duplica el de `loadConfig`.
        const stopWatchingLocale = locale.subscribe((lang) => {
            if (lang) void loadFilesystem(lang);
        });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            stopWatchingLocale();
        };
    });

    function openTerminalWithAI() {
        startInChatMode.set(true);
        isTerminalVisible.set(true);
    }
</script>

<svelte:head>
    <title>{pageTitle}</title>
    <meta name="description" content={pageDescription} />
    <meta name="author" content={ownerName} />
    <link rel="canonical" href={canonical} />

    <meta property="og:type" content={seo?.type || 'profile'} />
    <meta property="og:site_name" content={siteTitle} />
    <meta property="og:title" content={pageTitle} />
    <meta property="og:description" content={pageDescription} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={socialImage} />
    <meta property="og:image:alt" content={`${ownerName} — ${ownerRole}`} />
    <meta property="og:locale" content={$locale === 'en' ? 'en_US' : 'es_AR'} />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={pageTitle} />
    <meta name="twitter:description" content={pageDescription} />
    <meta name="twitter:image" content={socialImage} />

    {@html `<script type="application/ld+json">${personJsonLd}</scr` + `ipt>`}
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
                <span class="me-2">⚡</span> {$t('page.home.talk_to_ai', {
                    values: { name: aiDisplayName }
                })}
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