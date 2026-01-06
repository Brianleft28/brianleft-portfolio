<script lang="ts">
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js';
	import 'highlight.js/styles/github-dark.css';
	import mermaid from 'mermaid';
	import { onMount } from 'svelte';

	import type { FileNode } from '$lib/data/file-system';

	interface Props {
		file: FileNode;
	}

	let { file }: Props = $props();

	let mermaidInitialized = false;

	const marked = new Marked(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				// Si es mermaid, lo marcamos para renderizar después
				if (lang === 'mermaid') {
					return `<div class="mermaid">${code}</div>`;
				}
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	function renderMarkdown(text: string): string {
		return marked.parse(text) as string;
	}

	async function renderMermaidDiagrams() {
		if (!mermaidInitialized) {
			mermaid.initialize({
				startOnLoad: false,
				theme: 'dark',
				themeVariables: {
					primaryColor: '#00bc8c',
					primaryTextColor: '#fff',
					primaryBorderColor: '#00bc8c',
					lineColor: '#adb5bd',
					secondaryColor: '#375a7f',
					tertiaryColor: '#303030'
				}
			});
			mermaidInitialized = true;
		}
		await mermaid.run({ querySelector: '.mermaid' });
	}

	onMount(() => {
		renderMermaidDiagrams();
	});

	// Re-render cuando cambia el archivo
	$effect(() => {
		file; // dependency
		// Pequeño delay para que el DOM se actualice
		setTimeout(() => renderMermaidDiagrams(), 50);
	});
</script>

<article class="file-viewer-content">
	{@html renderMarkdown(file.content || '*Archivo sin contenido*')}
</article>

<style>
	.file-viewer-content {
		padding: 1.5rem 2rem;
		color: #adb5bd;
		line-height: 1.7;
		min-height: 100%;
		background: #222; /* Fondo consistente */
	}

	/* ========== TIPOGRAFÍA MARKDOWN ========== */
	:global(.file-viewer-content h1) {
		color: #fff;
		font-size: 1.6rem;
		font-weight: 700;
		margin-top: 0;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #00bc8c;
	}

	:global(.file-viewer-content h2) {
		color: #e9ecef;
		font-size: 1.2rem;
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	:global(.file-viewer-content h3) {
		color: #dee2e6;
		font-size: 1rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.4rem;
	}

	:global(.file-viewer-content p) {
		margin-bottom: 0.75rem;
	}

	:global(.file-viewer-content strong) {
		color: #fff;
		font-weight: 600;
	}

	:global(.file-viewer-content a) {
		color: #00bc8c;
		text-decoration: none;
		border-bottom: 1px dotted #00bc8c;
		transition: all 0.2s;
	}

	:global(.file-viewer-content a:hover) {
		color: #3498db;
		border-bottom-color: #3498db;
	}

	/* Código inline */
	:global(.file-viewer-content code:not(pre code)) {
		background: #375a7f;
		color: #fff;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.85em;
		font-family: 'Consolas', 'Monaco', monospace;
	}

	/* Bloques de código */
	:global(.file-viewer-content pre) {
		background: #1a1a1a;
		border: 1px solid #444;
		border-radius: 6px;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
	}

	:global(.file-viewer-content pre code) {
		background: transparent;
		padding: 0;
		font-size: 0.85rem;
		color: #e0e0e0;
	}

	/* Tablas */
	:global(.file-viewer-content table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
		font-size: 0.9rem;
	}

	:global(.file-viewer-content th) {
		background: #303030;
		color: #00bc8c;
		padding: 0.5rem 0.75rem;
		text-align: left;
		border: 1px solid #444;
		font-weight: 600;
	}

	:global(.file-viewer-content td) {
		padding: 0.4rem 0.75rem;
		border: 1px solid #444;
		background: #262626;
	}

	:global(.file-viewer-content tr:nth-child(even) td) {
		background: #2a2a2a;
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
		color: #00bc8c;
	}

	/* Líneas horizontales */
	:global(.file-viewer-content hr) {
		border: none;
		border-top: 1px solid #444;
		margin: 1.5rem 0;
	}

	/* Blockquotes */
	:global(.file-viewer-content blockquote) {
		border-left: 3px solid #00bc8c;
		margin: 1rem 0;
		padding: 0.5rem 1rem;
		background: rgba(0, 188, 140, 0.08);
		color: #adb5bd;
		font-style: italic;
		border-radius: 0 4px 4px 0;
	}

	:global(.file-viewer-content blockquote p) {
		margin: 0;
	}

	/* Mermaid diagrams */
	:global(.file-viewer-content .mermaid) {
		background: #1a1a1a;
		border: 1px solid #444;
		border-radius: 6px;
		padding: 1rem;
		margin: 1rem 0;
		text-align: center;
	}

	:global(.file-viewer-content .mermaid svg) {
		max-width: 100%;
		height: auto;
	}
</style>
