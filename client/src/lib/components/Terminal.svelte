<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { isTerminalVisible } from '$lib/stores/ui';
	import { currentPath, startInChatMode, iaMode } from '$lib/stores/terminal';
	import { portfolioConfig, aiPersonality, loadConfig, loadGeminiApiKey, asciiBanner } from '$lib/stores/config';
	import { fileSystemData, type FileSystemNode, type FolderNode } from '$lib/data/file-system';
	
	// Sistema modular de comandos
	import { getCommand, getAllCommands, registerAiCommandAlias } from '$lib/terminal/commands';
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

	// Configurar renderer para abrir links en nueva pestaña
	const renderer = new marked.Renderer();
	renderer.link = ({ href, title, text }) => {
		const titleAttr = title ? ` title="${title}"` : '';
		return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
	};
	marked.use({ renderer });

	// Función helper para renderizar markdown síncronamente
	function renderMarkdown(text: string): string {
		return marked.parse(text) as string;
	}

	type HistoryItem = {
		type: 'prompt' | 'response' | 'error' | 'system';
		text: string;
		promptIndicator?: string;
	};

	let history: HistoryItem[] = $state([]);
	let currentPrompt = $state('');
	let promptHistory: string[] = $state([]);
	let historyIndex = $state(-1);
	let isLoading = $state(false);
	let inputElement: HTMLInputElement;
	let terminalElement: HTMLDivElement;
	let isChatModeActive = $state(false);
	let isInitialized = $state(false);

	// Configuración dinámica
	// Prioridad: AI Personality > Settings > Default
	let aiDisplayName = $derived($aiPersonality?.displayName || $portfolioConfig?.ai_name || 'AI Assistant');
	let aiCommandName = $derived($portfolioConfig?.ai_command || 'ai');
	let ownerName = $derived($portfolioConfig?.owner_name || 'Developer');
	
	// Greeting: prioridad a la personalidad de IA (configurable en Admin > IA & Personalidad)
	// Fallback a ai_greeting de settings si no hay personalidad configurada
	let rawGreeting = $derived($aiPersonality?.greeting || $portfolioConfig?.ai_greeting || '¡Hola! Soy {{ai_name}}. ¿En qué puedo ayudarte?');
	let aiGreeting = $derived(
		rawGreeting
			.replace(/\{\{ai_name\}\}/g, aiDisplayName)
			.replace(/\{\{owner_name\}\}/g, ownerName)
	);

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
		// Cargar configuración primero
		loadConfig();
		loadGeminiApiKey();
		
		// Limpiar terminal al abrir
		history = [];
		promptHistory = [];
		historyIndex = -1;
		isChatModeActive = false;
		currentPath.set('C:\\');

		// Registrar alias dinámico para el comando AI
		if (aiCommandName && aiCommandName !== 'ai') {
			registerAiCommandAlias(aiCommandName);
		}

		// Mostrar bienvenida dinámica
		showWelcome();

		// Verificar si debe iniciar en modo chat (desde el botón)
		if ($startInChatMode) {
			isChatModeActive = true;
			addSystemMessage(`<span class="ai-success">✓ ${aiDisplayName} iniciado</span> en modo <span class="mode-name">${$iaMode || 'asistente'}</span>
<br>${aiGreeting}
<br><br><span class="system-hint">Cambiar modo: /${aiCommandName} mode &lt;modo&gt; | Usar: ${aiCommandName} modes</span>
<span class="system-hint">Salir: exit</span>`);
			startInChatMode.set(false); // Reset
		}

		isInitialized = true;
		inputElement?.focus();
	});

	function showWelcome() {
		const name = ownerName;
		const role = $portfolioConfig?.owner_role_short || 'Developer';
		const aiCmd = aiCommandName;
		const aiNm = aiDisplayName;
		const banner = $asciiBanner;

		// Si hay banner ASCII, mostrarlo primero
		let bannerHtml = '';
		if (banner) {
			bannerHtml = `<pre class="ascii-logo">${banner}</pre>
<span class="welcome-subtitle">${role}</span>

`;
		}
		
		const welcomeMsg = `${bannerHtml}<span class="system-header">📚 Comandos disponibles:</span>

<span class="category-header">  📁 Navegación</span>
       <span class="command-highlight">cd</span>          Cambiar directorio
       <span class="command-highlight">ls</span>          Listar archivos y carpetas
       <span class="command-highlight">pwd</span>         Mostrar directorio actual
       <span class="command-highlight">tree</span>        Árbol de directorios

<span class="category-header">  📄 Archivos</span>
       <span class="command-highlight">cat</span>         Ver contenido de archivo

<span class="category-header">  ⚙️ Terminal</span>
       <span class="command-highlight">cls</span>         Limpiar consola (Ctrl+L)
       <span class="command-highlight">help</span> o <span class="command-highlight">-h</span>   Mostrar ayuda completa
       <span class="command-highlight">exit</span>        Cerrar terminal

<span class="category-header">  🤖 Inteligencia Artificial</span>
       <span class="command-highlight">${aiCmd}</span>        ${aiNm} con modos especializados

<span class="category-header">  🔐 Configuración</span>
       <span class="command-highlight">apikey</span>      Configurar tu API key de Gemini
       <span class="command-highlight">admin</span>       Panel de administración

<span class="system-hint">💡 Tip: Usa &lt;comando&gt; -h para ayuda detallada</span>`;
		addSystemMessage(welcomeMsg);
	}

	// Guardar cuando cambie el estado (usando $effect en lugar de $:)
	$effect(() => {
		if (isInitialized && history) {
			saveToStorage();
		}
	});

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
			setAiMode: (mode: string | null) => iaMode.set(mode || 'arquitecto'),
			// Configuración dinámica
			aiCommandName: aiCommandName,
			aiDisplayName: aiDisplayName,
			ownerName: ownerName
		};
	}

	// Comandos legacy que requieren lógica especial del componente
	const legacyCommands: Record<string, (args: string[]) => Promise<void>> = {
		torvaldsai: async (args) => {
			const initialPrompt = args.join(' ');
			isChatModeActive = true;

			if (!initialPrompt) {
				const welcomeMsg = `<span class="ai-success">✓ ${aiDisplayName} iniciado</span> en modo <span class="mode-name">${$iaMode || 'asistente'}</span>
<br>${aiGreeting}
<br><br><span class="system-hint">Cambiar modo: /${aiCommandName} mode &lt;modo&gt; | Usar: ${aiCommandName} modes</span>
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

	// Buffer para efecto typewriter
	let typewriterBuffer = $state('');
	let typewriterIndex = $state(0);
	let typewriterInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isTyping = $state(false);

	function startTypewriter(responseIndex: number) {
		if (typewriterInterval) clearInterval(typewriterInterval);
		isTyping = true;
		
		typewriterInterval = setInterval(() => {
			if (typewriterIndex < typewriterBuffer.length) {
				// Escribir de a chunks de 3-5 caracteres para velocidad natural
				const chunkSize = Math.floor(Math.random() * 3) + 2;
				const nextChunk = typewriterBuffer.slice(typewriterIndex, typewriterIndex + chunkSize);
				history[responseIndex].text += nextChunk;
				typewriterIndex += chunkSize;
				history = history;
				scrollToBottom();
			} else if (!isLoading) {
				// Streaming terminó y ya mostramos todo
				stopTypewriter();
			}
		}, 15); // ~60 caracteres por segundo
	}

	function stopTypewriter() {
		if (typewriterInterval) {
			clearInterval(typewriterInterval);
			typewriterInterval = null;
		}
		isTyping = false;
	}

	async function handleAIChat(prompt: string) {
		const responseIndex = history.length;
		addHistoryItem({ type: 'response', text: '' });
		
		// Reset buffer para typewriter
		typewriterBuffer = '';
		typewriterIndex = 0;
		startTypewriter(responseIndex);

		try {
			// Obtener API key del usuario si existe
			const userApiKey = loadGeminiApiKey();
			
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					prompt, 
					mode: $iaMode,
					apiKey: userApiKey || undefined
				})
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
				// Acumular en buffer, el typewriter lo va mostrando
				typewriterBuffer += chunk;
			}

			// Esperar a que el typewriter termine de mostrar todo
			while (typewriterIndex < typewriterBuffer.length) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
			
			stopTypewriter();

			// Limpiar espacios excesivos al final
			history[responseIndex].text = history[responseIndex].text
				.replace(/\n{3,}/g, '\n\n')
				.trim();
			history = history;
		} catch (error) {
			stopTypewriter();
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

	let promptIndicator = $derived(isChatModeActive
		? `🤖 ${aiDisplayName} [${$iaMode || 'arquitecto'}]> `
		: $currentPath + '> ');
</script>

<div
	bind:this={terminalElement}
	class="terminal-overlay position-fixed bottom-0 start-0 w-100 d-flex flex-column"
	tabindex="-1"
	role="dialog"
	aria-modal="true"
	aria-label="Terminal"
	onkeydown={(e) => {
		if (e.key === 'Escape') handleClose();
	}}
>
	<div class="d-flex justify-content-end me-2 mt-2 p-2">
		<button class="btn-close-neon" onclick={handleClose} aria-label="Cerrar Terminal">✕</button
		>
	</div>

	<div
		class="terminal-content flex-grow-1 d-flex flex-column overflow-hidden px-3 pb-3"
		role="button"
		tabindex="0"
		onclick={() => inputElement?.focus()}
		onkeydown={(e) => {
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
			{#if isLoading || isTyping}
				<div class="line">
					<span class="typing-cursor">▋</span>
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
				onkeydown={(e) => {
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

	.typing-cursor {
		color: #4ec9b0;
		animation: blink 0.7s infinite;
		font-weight: bold;
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
