<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { isTerminalVisible } from '$lib/stores/ui';
	import { currentPath, startInChatMode, iaMode } from '$lib/stores/terminal';
	import { fileSystemData, type FileSystemNode, type FolderNode } from '$lib/data/file-system';
	
	// Sistema modular de comandos
	import { getCommand, getAllCommands } from '$lib/terminal/commands';
	import type { CommandContext } from '$lib/terminal/types';

	// Importaciones para Markdown y Highlight
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js';
	import 'highlight.js/styles/github-dark.css';

	// Configuración de Marked con Highlight.js
	const marked = new Marked(
		markedHighlight({
			langPrefix: 'hljs language-',
			highlight(code, lang) {
				const language = hljs.getLanguage(lang) ? lang : 'plaintext';
				return hljs.highlight(code, { language }).value;
			}
		})
	);

	// Función helper para renderizar markdown síncronamente
	function renderMarkdown(text: string): string {
		return marked.parse(text) as string;
	}

	type HistoryItem = {
		type: 'prompt' | 'response' | 'error' | 'system';
		text: string;
		promptIndicator?: string;
	};

	let history: HistoryItem[] = [];
	let currentPrompt = '';
	let promptHistory: string[] = [];
	let historyIndex = -1;
	let isLoading = false;
	let inputElement: HTMLInputElement;
	let terminalElement: HTMLDivElement;
	let isChatModeActive = false;
	let isInitialized = false;

	// Cargar desde localStorage
	function loadFromStorage() {
		if (typeof window === 'undefined') return;

		try {
			const savedHistory = localStorage.getItem('terminal-history');
			const savedChatMode = localStorage.getItem('terminal-chat-mode');
			const savedPath = localStorage.getItem('terminal-path');

			if (savedHistory) {
				history = JSON.parse(savedHistory);
				promptHistory = history
					.filter((item) => item.type === 'prompt')
					.map((item) => item.text);
				historyIndex = promptHistory.length;
			}

			if (savedChatMode === 'true') {
				isChatModeActive = true;
			}

			if (savedPath) {
				currentPath.set(savedPath);
			}
		} catch (e) {
			console.error('Error loading terminal state:', e);
		}
	}

	// Guardar en localStorage
	function saveToStorage() {
		if (typeof window === 'undefined' || !isInitialized) return;

		try {
			localStorage.setItem('terminal-history', JSON.stringify(history));
			localStorage.setItem('terminal-chat-mode', String(isChatModeActive));
			localStorage.setItem('terminal-path', $currentPath);
		} catch (e) {
			console.error('Error saving terminal state:', e);
		}
	}

	onMount(() => {
		// Limpiar terminal al abrir
		history = [];
		promptHistory = [];
		historyIndex = -1;
		isChatModeActive = false;
		currentPath.set('C:\\');

		// Mostrar bienvenida
		const welcomeMsg = `<pre class="ascii-logo">╔════════════════════════════════════════════════════════════════════╗
║  ____       _               ____                                   ║
║ | __ ) _ __(_) __ _ _ __   | __ )  ___ _ __   ___  __ _  __ _ ___  ║
║ |  _ \\| '__| |/ _\` | '_ \\  |  _ \\ / _ \\ '_ \\ / _ \\/ _\` |/ _\` / __| ║
║ | |_) | |  | | (_| | | | | | |_) |  __/ | | |  __/ (_| | (_| \\__ \\ ║
║ |____/|_|  |_|\\__,_|_| |_| |____/ \\___|_| |_|\\___|\\__, |\\__,_|___/ ║
║                                                   |___/            ║
║                  <span class="welcome-subtitle">Full Stack Developer & DevOps</span>                     ║
╚════════════════════════════════════════════════════════════════════╝</pre>
<span class="system-header">📚 Comandos disponibles:</span>

<span class="category-header">  📁 Navegación</span>
       <span class="command-highlight">cd</span>          Cambiar directorio
       <span class="command-highlight">ls</span>          Listar archivos y carpetas
       <span class="command-highlight">pwd</span>         Mostrar directorio actual
       <span class="command-highlight">tree</span>        Árbol de directorios

<span class="category-header">  📄 Archivos</span>
       <span class="command-highlight">cat</span>         Ver contenido de archivo

<span class="category-header">  ⚙️ Terminal</span>
       <span class="command-highlight">cls</span>         Limpiar consola (Ctrl+L)
       <span class="command-highlight">help o -h </span>        Mostrar ayuda completa
       <span class="command-highlight">exit</span>        Cerrar terminal

<span class="category-header">  🐧 Inteligencia Artificial</span>
       <span class="command-highlight">torvalds</span>    Asistente AI con modos especializados

<span class="system-hint">💡 Tip: Usa &lt;comando&gt; -h para ayuda detallada</span>`;
		addSystemMessage(welcomeMsg);

		// Verificar si debe iniciar en modo chat (desde el botón)
		if ($startInChatMode) {
			isChatModeActive = true;
			addSystemMessage(`<span class="ai-success">✓ TorvaldsAI iniciado</span> en modo <span class="mode-name">${$iaMode || 'arquitecto'}</span>
<br>Hablemos sobre Brian, sus proyectos, experiencia o la arquitectura de este portfolio.
<br><br><span class="system-hint">Cambiar modo: /arquitecto, /debugger, /documentador</span>
<span class="system-hint">Salir: exit</span>`);
			startInChatMode.set(false); // Reset
		}

		isInitialized = true;
		inputElement?.focus();
	});

	// Guardar cada vez que cambie el historial o modo chat
	$: if (isInitialized) {
		saveToStorage();
	}

	// Re-guardar cuando cambie history específicamente
	$: if (isInitialized && history) {
		saveToStorage();
	}

	// Helper para obtener nodo en una ruta
	function getNodeAtPath(path: string): FileSystemNode | undefined {
		const pathParts = path.split('\\').filter((p) => p && p !== 'C:');
		let current: FileSystemNode = fileSystemData;

		for (const part of pathParts) {
			if (current.type !== 'folder') return undefined;
			const folder = current as FolderNode;
			const found = folder.children.find(
				(child) => child.name.toLowerCase() === part.toLowerCase()
			);
			if (!found) return undefined;
			current = found;
		}

		return current;
	}

	// Crear contexto para comandos modulares
	function createCommandContext(): CommandContext {
		return {
			currentPath: $currentPath,
			setPath: (newPath: string) => currentPath.set(newPath),
			getNodeAtPath,
			aiMode: $iaMode,
			setAiMode: (mode: string | null) => iaMode.set(mode || 'arquitecto')
		};
	}

	// Comandos legacy que requieren lógica especial del componente
	const legacyCommands: Record<string, (args: string[]) => Promise<void>> = {
		torvaldsai: async (args) => {
			const initialPrompt = args.join(' ');
			isChatModeActive = true;

			if (!initialPrompt) {
				const welcomeMsg = `<span class="ai-success">✓ TorvaldsAI iniciado</span> en modo <span class="mode-name">${$iaMode || 'arquitecto'}</span>
<br>Pregúntame sobre los proyectos de Brian, experiencia o arquitectura de este portfolio.
<br><br><span class="system-hint">Cambiar modo: /arquitecto, /debugger, /documentador</span>
<span class="system-hint">Salir: exit</span>`;
				addSystemMessage(welcomeMsg);
				return;
			}
			await handleAIChat(initialPrompt);
		},

		exit: async () => {
			handleClose();
		}
	};

	function addHistoryItem(item: HistoryItem) {
		history = [...history, item];
		if (item.type === 'prompt') {
			promptHistory = [...promptHistory, item.text];
			historyIndex = promptHistory.length;
		}
		scrollToBottom();
	}

	function addSystemMessage(text: string) {
		addHistoryItem({ type: 'system', text });
	}

	function addErrorMessage(text: string) {
		addHistoryItem({ type: 'error', text });
	}

	function handleClose() {
		// Limpiar terminal al cerrar
		history = [];
		promptHistory = [];
		historyIndex = -1;
		isChatModeActive = false;
		currentPath.set('C:\\');
		iaMode.set('arquitecto');

		// Limpiar localStorage
		if (typeof window !== 'undefined') {
			localStorage.removeItem('terminal-history');
			localStorage.removeItem('terminal-chat-mode');
		}

		isTerminalVisible.set(false);
	}

	async function handleSubmit() {
		if (isLoading || !currentPrompt.trim()) return;

		const promptText = currentPrompt;
		addHistoryItem({ type: 'prompt', text: promptText, promptIndicator });
		currentPrompt = '';

		if (isChatModeActive && promptText.toLowerCase().trim() === 'exit') {
			isChatModeActive = false;
			addSystemMessage('Chau loco! 👋');
			await tick();
			scrollToBottom();
			return;
		}

		const parts = promptText.trim().split(' ');
		const command = parts[0].toLowerCase();
		const args = parts.slice(1);

		// Manejar comandos de modo de IA
		const iaModeCommands = ['/arquitecto', '/debugger', '/documentador'];
		if (iaModeCommands.includes(command)) {
			const newMode = command.substring(1);
			iaMode.set(newMode);

			let modeMessage = `<span class="ai-success">✓</span> Modo IA cambiado a: <span class="mode-name">${newMode}</span>`;
			switch (newMode) {
				case 'arquitecto':
					modeMessage += '<br>Visión macro activada. ¿Qué sistema analizamos?';
					break;
				case 'debugger':
					modeMessage += '<br>Modo detective. Dame un stack trace y te daré al culpable.';
					break;
				case 'documentador':
					modeMessage += '<br>Generador de READMEs listo. ¿Qué documentamos?';
					break;
			}
			modeMessage +=
				'<br><br><span class="system-hint">Subcomandos: /arquitecto, /debugger, /documentador, exit</span>';
			addSystemMessage(modeMessage);
			currentPrompt = '';
			return;
		}

		isLoading = true;
		await tick();
		scrollToBottom();

		// Primero verificar comandos legacy (torvaldsai, exit)
		const legacyHandler = legacyCommands[command];
		if (legacyHandler) {
			await legacyHandler(args);
			isLoading = false;
			await tick();
			inputElement?.focus();
			scrollToBottom();
			return;
		}

		// Luego verificar comandos modulares
		const modularCommand = getCommand(command);
		if (modularCommand) {
			const ctx = createCommandContext();
			const result = modularCommand.execute(args, ctx);

			// Sincronizar estado del modo AI con el componente
			if (ctx.aiMode !== $iaMode) {
				iaMode.set(ctx.aiMode || 'arquitecto');
			}

			// Activar/desactivar modo chat basado en comando torvalds
			if (command === 'torvalds') {
				const subCmd = args[0];
				if (subCmd === 'start') {
					isChatModeActive = true;
				} else if (subCmd === 'stop') {
					isChatModeActive = false;
				}
			}

			// Manejar resultado del comando
			if (result.clear) {
				history = [];
				promptHistory = [];
				historyIndex = -1;
				isChatModeActive = false;
				if (typeof window !== 'undefined') {
					localStorage.removeItem('terminal-history');
					localStorage.removeItem('terminal-chat-mode');
				}
				currentPath.set('C:\\');
				addSystemMessage("Terminal limpiada. Usa 'help' para ver los comandos.");
			} else if (result.output) {
				if (result.isMarkdown) {
					addHistoryItem({ type: 'response', text: result.output });
				} else if (result.isHtml) {
					addSystemMessage(result.output);
				} else {
					addSystemMessage(result.output);
				}
			}
		} else if (isChatModeActive) {
			// Si estamos en modo chat, enviar a IA
			await handleAIChat(promptText);
		} else {
			addErrorMessage(`Comando no reconocido: '${command}'. Escribe 'help' para ver la lista.`);
		}

		isLoading = false;
		await tick();
		inputElement?.focus();
		scrollToBottom();
	}

	async function handleAIChat(prompt: string) {
		const responseIndex = history.length;
		addHistoryItem({ type: 'response', text: '' });

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, mode: $iaMode })
			});

			if (!response.ok || !response.body) {
				throw new Error('La respuesta de la API no fue válida.');
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				history[responseIndex].text += chunk;
				history = history;
				scrollToBottom();
			}

			// Limpiar espacios excesivos al final
			history[responseIndex].text = history[responseIndex].text
				.replace(/\n{3,}/g, '\n\n')
				.trim();
			history = history;
		} catch (error) {
			console.error('Error en el chat con IA:', error);
			history[responseIndex].text =
				'Kernel Panic: No se pudo conectar con el núcleo cognitivo.';
			history = history;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			if (historyIndex > 0) {
				historyIndex--;
				currentPrompt = promptHistory[historyIndex];
			}
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (historyIndex < promptHistory.length - 1) {
				historyIndex++;
				currentPrompt = promptHistory[historyIndex];
			} else {
				historyIndex = promptHistory.length;
				currentPrompt = '';
			}
		}
	}

	function scrollToBottom() {
		tick().then(() => {
			const output = terminalElement?.querySelector('.terminal-output');
			if (output) {
				output.scrollTop = output.scrollHeight;
			}
		});
	}

	$: promptIndicator = isChatModeActive
		? `🐧 TorvaldsAi [${$iaMode || 'arquitecto'}]> `
		: $currentPath + '> ';
</script>

<div
	bind:this={terminalElement}
	class="terminal-overlay position-fixed bottom-0 start-0 w-100 d-flex flex-column"
	tabindex="-1"
	role="dialog"
	aria-modal="true"
	aria-label="Terminal"
	on:keydown={(e) => {
		if (e.key === 'Escape') handleClose();
	}}
>
	<div class="d-flex justify-content-end me-2 mt-2 p-2">
		<button class="btn-close-neon" on:click={handleClose} aria-label="Cerrar Terminal">✕</button
		>
	</div>

	<div
		class="terminal-content flex-grow-1 d-flex flex-column overflow-hidden px-3 pb-3"
		role="button"
		tabindex="0"
		on:click={() => inputElement?.focus()}
		on:keydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') inputElement?.focus();
		}}
	>
		<div class="terminal-output flex-grow-1 overflow-y-auto pe-2">
			{#each history as item, i (i)}
				<div class="line">
					{#if item.type === 'prompt'}
						<span class="prompt-user">{item.promptIndicator || promptIndicator}</span>
						<span>{item.text}</span>
					{:else if item.type === 'response'}
						<div class="ai-response-wrapper">
							<span class="ai-markdown">{@html renderMarkdown(item.text)}</span>
						</div>
					{:else if item.type === 'error'}
						<span class="prompt-error">{item.text}</span>
					{:else if item.type === 'system'}
						<div class="system-message">{@html item.text}</div>
					{/if}
				</div>
			{/each}
			{#if isLoading}
				<div class="line">
					<span class="thinking">...</span>
				</div>
			{/if}
		</div>

		<div class="input-line d-flex align-items-center flex-nowrap">
			<span class="prompt-user me-2" style="white-space: nowrap;">{promptIndicator}</span>
			<input
				bind:this={inputElement}
				bind:value={currentPrompt}
				class="form-control-plaintext text-white flex-grow-1"
				type="text"
				autocomplete="off"
				spellcheck="false"
				on:keydown={(e) => {
					if (e.key === 'Enter') handleSubmit();
					else handleKeyDown(e);
				}}
			/>
		</div>
	</div>
</div>

<style>
	.terminal-overlay {
		height: 70vh;
		background-color: rgba(20, 20, 20, 0.97);
		backdrop-filter: blur(5px);
		border-top: 1px solid #333;
		z-index: 1000;
		animation: slide-up 0.3s ease-out;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 14px;
	}

	.terminal-output {
		scrollbar-width: thin;
		scrollbar-color: #444 #1a1a1a;
	}

	.line {
		margin-bottom: 0.35rem;
		line-height: 1.4;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	/* Respuesta IA - texto fluido */
	.ai-response-wrapper {
		display: block;
	}

	.ai-markdown {
		color: #d4d4d4;
		display: inline;
	}

	/* Markdown interno - reducir espaciado */
	:global(.ai-markdown p) {
		margin: 0;
		display: inline;
	}

	:global(.ai-markdown p + p) {
		display: block;
		margin-top: 0.3rem;
	}

	:global(.ai-markdown pre) {
		display: block;
		clear: both;
		background: #1e1e1e;
		padding: 0.75rem;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0.5rem 0;
		border: 1px solid #333;
	}

	:global(.ai-markdown code) {
		font-family: inherit;
		font-size: 0.95em;
	}

	:global(.ai-markdown code:not(pre code)) {
		background: #2d2d2d;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}

	:global(.ai-markdown ul),
	:global(.ai-markdown ol) {
		display: block;
		clear: both;
		margin: 0.3rem 0;
		padding-left: 1.5rem;
	}

	:global(.ai-markdown li) {
		margin-bottom: 0.15rem;
	}

	:global(.ai-markdown ul),
	:global(.ai-markdown ol) {
		display: block;
		clear: both;
		margin: 0.4rem 0;
		padding-left: 1.5rem;
	}

	:global(.ai-markdown li) {
		margin-bottom: 0.2rem;
		color: #d4d4d4;
	}

	:global(.ai-markdown li::marker) {
		color: #4ec9b0; /* Verde como el prompt */
	}

	:global(.ai-markdown li strong) {
		color: #bb3b00; /* Azul para negritas en listas */
	}

	:global(.ai-markdown li code) {
		background: #2d2d2d;
		color: #ce9178; /* Naranja para código inline */
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}

	:global(.ai-markdown table) {
		border-collapse: collapse;
		margin: 0.5rem 0;
		width: 100%;
		clear: both;
	}

	:global(.ai-markdown th) {
		background: #2d2d2d;
		color: #4ec9b0;
		padding: 0.4rem 0.8rem;
		text-align: left;
		border: 1px solid #444;
	}

	:global(.ai-markdown td) {
		padding: 0.3rem 0.8rem;
		border: 1px solid #333;
		color: #d4d4d4;
	}

	:global(.ai-markdown tr:nth-child(even)) {
		background: rgba(255, 255, 255, 0.03);
	}

	.prompt-user {
		color: #4ec9b0;
	}

	.prompt-error {
		color: #f44747;
	}

	.system-message {
		color: #808080;
		white-space: pre-wrap;
	}

	:global(.command-highlight) {
		color: #9cdcfe;
		font-weight: bold;
	}

	/* Estilos para TorvaldsAI */
	:global(.ai-header) {
		color: #9b59b6;
	}

	:global(.ai-success) {
		color: #2ecc71;
	}

	:global(.ai-warning) {
		color: #f39c12;
	}

	:global(.ai-error) {
		color: #e74c3c;
	}

	:global(.ai-prompt) {
		color: #9b59b6;
		font-style: italic;
	}

	:global(.ai-prompt-active) {
		color: #9b59b6;
		font-weight: bold;
	}

	:global(.system-header) {
		color: #00bc8c;
		font-weight: bold;
	}

	:global(.system-hint) {
		color: #666;
		font-style: italic;
	}

	:global(.mode-name) {
		color: #9b59b6;
		font-weight: bold;
	}

	:global(.folder-name) {
		color: #f1c40f;
	}

	:global(.file-name) {
		color: #e0e0e0;
	}

	:global(.error-text) {
		color: #e74c3c;
	}

	:global(.ascii-logo) {
		color: #4ec9b0;
		white-space: pre;
		font-size: 11px;
		line-height: 1.15;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
	}

	:global(.welcome-subtitle) {
		color: #9b59b6;
		font-weight: bold;
	}

	:global(.help-box) {
		color: #3d5a80;
		white-space: pre;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 13px;
		line-height: 1.3;
		margin: 0;
		padding: 0;
		background: transparent;
		border: none;
	}

	:global(.category-header) {
		color: #f39c12;
		font-weight: bold;
	}

	.form-control-plaintext:focus {
		outline: none;
		box-shadow: none;
	}

	.thinking {
		color: #808080;
		animation: blink 1s infinite;
	}

	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
