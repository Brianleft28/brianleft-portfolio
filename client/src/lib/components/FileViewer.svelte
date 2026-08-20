<script lang="ts">
    import { Marked } from 'marked';
    import { markedHighlight } from 'marked-highlight';
    import hljs from 'highlight.js';
    import 'highlight.js/styles/github-dark.css';
    import { onMount, tick } from 'svelte';
    import { mermaidBlock, hasMermaid, renderMermaid } from '$lib/mermaid';
    import ContactForm from './ContactForm.svelte';

    import type { FileNode } from '$lib/data/file-system';

    interface Props {
        file: FileNode;
    }

    let { file }: Props = $props();
    let renderedHtml = $state<string>('');

    // Detectar archivos especiales (apps). Se aceptan los nombres con `.exe`
    // porque son los que quedaron en instalaciones anteriores, de cuando el
    // sistema simulaba Windows.
    const isContactApp = $derived(
        ['contacto', 'contact', 'contacto.exe', 'contact.exe'].includes(
            file.name.toLowerCase()
        )
    );

    // Crear instancia de Marked con highlight integrado.
    // Los bloques ```mermaid se desvían antes de llegar a highlight.js, que no
    // conoce ese lenguaje y los degradaba a texto plano.
    const marked = new Marked(
        markedHighlight({
            langPrefix: 'hljs language-',
            highlight(code, lang) {
                if (lang === 'mermaid') return code;
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            }
        }),
        {
            gfm: true,
            breaks: true
        }
    );

    marked.use({
        renderer: {
            code({ text, lang }) {
                if (lang === 'mermaid') return mermaidBlock(text);
                return false; // el resto sigue por el renderer por defecto
            }
        }
    });

    /**
     * Primer parseo, sincrónico y en el cuerpo del componente.
     *
     * `onMount` y `$effect` no corren durante el render del servidor, así que
     * si el markdown se parseara sólo ahí el HTML servido saldría con el visor
     * vacío. Es exactamente lo que hacía que el sitio tuviera 202 caracteres de
     * texto indexable. Los dibujos de mermaid sí quedan para el cliente.
     */
    if (!isContactApp) {
        renderedHtml = marked.parse(file.content || '*Archivo sin contenido*') as string;
    }

    let contentElement = $state<HTMLElement | null>(null);

    async function updateContent(content: string) {
        renderedHtml = await marked.parse(content);
        if (hasMermaid(renderedHtml)) {
            await tick();
            await renderMermaid(contentElement);
        }
    }

    onMount(() => {
        if (!isContactApp) {
            updateContent(file.content || '*Archivo sin contenido*');
        }
    });

    $effect(() => {
        if (!isContactApp) {
            updateContent(file.content || '*Archivo sin contenido*');
        }
    });
</script>

{#if isContactApp}
    <ContactForm />
{:else}
    <article class="file-viewer-content" bind:this={contentElement}>
        {@html renderedHtml}
    </article>
{/if}

<style>
	.file-viewer-content {
		padding: 1.5rem 2rem;
		color: var(--theme-text-primary);
		line-height: 1.7;
		background: transparent;
	}

	/* ========== TIPOGRAFÍA MARKDOWN ========== */
	:global(.file-viewer-content h1) {
		color: var(--theme-text-bright);
		font-size: 1.6rem;
		font-weight: 700;
		margin-top: 0;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--theme-accent);
	}

	:global(.file-viewer-content h2) {
		color: var(--theme-text-primary);
		font-size: 1.2rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	:global(.file-viewer-content h3) {
		color: var(--theme-text-primary);
		font-size: 1rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.4rem;
	}

	:global(.file-viewer-content p) {
		margin-bottom: 0.75rem;
	}

	:global(.file-viewer-content strong) {
		color: var(--theme-text-bright);
		font-weight: 600;
	}

	:global(.file-viewer-content a) {
		color: var(--theme-accent);
		text-decoration: none;
		border-bottom: 1px dotted var(--theme-accent);
		transition: all 0.2s;
	}

	:global(.file-viewer-content a:hover) {
		color: var(--theme-secondary);
		border-bottom-color: var(--theme-secondary);
	}

	/* Código inline */
	:global(.file-viewer-content code:not(pre code)) {
		background: var(--theme-bg-secondary);
		color: var(--theme-warning);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.85em;
		font-family: 'Consolas', 'Monaco', monospace;
	}

	/* Bloques de código */
	:global(.file-viewer-content pre) {
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-border);
		border-radius: 6px;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}

	/* Diagramas: el SVG manda, no la caja de código */
	:global(.file-viewer-content pre.mermaid) {
		background: transparent;
		border: none;
		padding: 0.5rem 0;
		text-align: center;
		line-height: normal;
	}

	:global(.file-viewer-content pre.mermaid svg) {
		max-width: 100%;
		height: auto;
	}

	/* Si el diagrama no compila, al menos se lee el código fuente */
	:global(.file-viewer-content pre.mermaid-error) {
		background: var(--theme-bg-tertiary);
		border: 1px solid var(--theme-border);
		padding: 1rem;
		text-align: left;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.8rem;
		white-space: pre-wrap;
	}

	:global(.file-viewer-content pre code) {
		background: transparent;
		padding: 0;
		font-size: 0.85rem;
		color: var(--theme-text-primary);
	}

	/* Tablas */
	:global(.file-viewer-content table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		font-size: 0.9rem;
	}

	:global(.file-viewer-content th) {
		background: var(--theme-bg-secondary);
		color: var(--theme-accent);
		padding: 0.5rem 0.75rem;
		text-align: left;
		border: 1px solid var(--theme-border);
		font-weight: 600;
	}

	:global(.file-viewer-content td) {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--theme-border);
		background: transparent;
	}

	:global(.file-viewer-content tr:nth-child(even) td) {
		background: var(--theme-accent-subtle);
	}

	/* Listas */
	:global(.file-viewer-content ul),
	:global(.file-viewer-content ol) {
		margin: 0.75rem 0;
		padding-left: 1.5rem;
	}

	:global(.file-viewer-content li) {
		margin-bottom: 0.35rem;
	}

	:global(.file-viewer-content li::marker) {
		color: var(--theme-accent);
	}

	/* Líneas horizontales */
	:global(.file-viewer-content hr) {
		border: none;
		border-top: 1px solid var(--theme-border);
		margin: 1.5rem 0;
	}

	/* Blockquotes */
	:global(.file-viewer-content blockquote) {
		border-left: 3px solid var(--theme-accent);
		margin: 1rem 0;
		padding: 0.5rem 1rem;
		background: var(--theme-accent-subtle);
		color: var(--theme-text-secondary);
		font-style: italic;
		border-radius: 0 4px 4px 0;
	}

	:global(.file-viewer-content blockquote p) {
		margin: 0;
	}
</style>
