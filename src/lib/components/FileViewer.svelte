<script lang="ts">
    import type { FileNode } from '$lib/data/file-system'; // Asegúrate que la ruta sea correcta
    import { Marked } from 'marked';
    import { markedHighlight } from 'marked-highlight';
    import hljs from 'highlight.js';
    
    // Importamos el tema (puedes cambiar 'atom-one-dark' por otro)
    import 'highlight.js/styles/atom-one-dark.css';

    // Recibimos el archivo como Propiedad
    let { file } = $props<{ file: FileNode }>();

    // Creamos una instancia de Marked
    // Usamos markedHighlight para inyectar la lógica de colores
    const marked = new Marked(
        markedHighlight({
            langPrefix: 'hljs language-',
            highlight(code: string, lang: string) { // <--- Tipamos explícitamente como string
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            }
        })
    );

    // Procesamos el Markdown
    // Nota: marked.parse puede devolver una Promise en algunos casos avanzados, 
    // pero por defecto es síncrono para strings. Forzamos el tipo a string si es necesario.
    let htmlContent = $derived(
        file.content 
        ? marked.parse(file.content) as string 
        : ''
    );
</script>

<div class="h-100 w-100">
    {#if file.type === 'markdown'}
        <div class="p-4 markdown-body overflow-auto h-100">
            {@html htmlContent}
        </div>

  {:else if file.type === 'component'}
        <div class="h-100 d-flex flex-column">
            {#if file.component}
                {@const ActiveApp = file.component}
                <ActiveApp />
            {:else}
                <div class="alert alert-warning m-3">
                    El archivo "{file.name}" es una aplicación, pero no tiene código asociado aún.
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .markdown-body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #24292f;
        background-color: white;
    }
    
    :global(.markdown-body img) {
        max-width: 100%;
    }

    /* Importante: Asegurar contraste en el bloque de código */
    :global(.markdown-body pre) {
        background-color: #282c34;
        padding: 1rem;
        border-radius: 6px;
        overflow: auto;
        color: #abb2bf; 
    }
</style>