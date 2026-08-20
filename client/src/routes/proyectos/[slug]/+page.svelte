<script lang="ts">
    import { page } from '$app/stores';
    import { _ } from 'svelte-i18n';
    import FileViewer from '$lib/components/FileViewer.svelte';
    import type { FileNode } from '$lib/data/file-system';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // FileViewer espera un FileNode; el contenido ya viene resuelto del server.
    let fileNode = $derived<FileNode>({
        id: data.project.slug,
        name: `${data.project.slug}.md`,
        type: 'markdown',
        content: data.project.content
    });

    // JSON-LD del proyecto. Convive con el `Person` del layout (varios bloques
    // ld+json son válidos). Identidad desde los settings que ya trae el layout.
    let settings = $derived(($page.data?.settings ?? {}) as Record<string, string>);
    let ownerName = $derived(settings.owner_name || 'Developer');
    let projectJsonLd = $derived(
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: data.seo.title,
            description: data.seo.description,
            url: $page.url.href.replace(/\/$/, ''),
            author: { '@type': 'Person', name: ownerName },
            codeRepository: settings.social_github || undefined
        })
    );
</script>

<svelte:head>
    {@html `<script type="application/ld+json">${projectJsonLd}</scr` + `ipt>`}
</svelte:head>

<div class="container-fluid py-2 font-monospace d-flex flex-column" style="height: 100vh; overflow: hidden;">
    <header class="row flex-shrink-0">
        <div class="col-12 mb-3 d-flex align-items-center gap-2">
            <a href="/" class="btn btn-link text-decoration-none p-0">~</a>
            <span class="text-muted">/</span>
            <a href="/" class="btn btn-link text-decoration-none p-0">proyectos</a>
            <span class="text-muted">/</span>
            <span>{data.project.slug}</span>
        </div>
        <hr />
    </header>

    <div class="row flex-grow-1 overflow-hidden" style="min-height: 0;">
        <div class="col-12 h-100 d-flex flex-column" style="min-height: 0; overflow: hidden;">
            <div
                class="card card-dark-viewer shadow-sm border-0 h-100 d-flex flex-column"
                style="overflow: hidden;"
            >
                <div class="card-body p-0 flex-grow-1 overflow-auto" style="background: transparent;">
                    <FileViewer file={fileNode} />
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .card-body::-webkit-scrollbar {
        width: 4px;
    }
    .card-body::-webkit-scrollbar-track {
        background: var(--theme-bg-tertiary);
        border-radius: 2px;
    }
    .card-body::-webkit-scrollbar-thumb {
        background: var(--theme-accent);
        border-radius: 2px;
        box-shadow: 0 0 8px var(--theme-accent-glow);
    }
</style>
