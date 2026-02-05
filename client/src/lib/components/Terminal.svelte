<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { isTerminalVisible } from '$lib/stores/ui';
	import { currentPath, startInChatMode, iaMode } from '$lib/stores/terminal';
	import { portfolioConfig, aiPersonality, loadConfig, loadGeminiApiKey, asciiBanner } from '$lib/stores/config';
	import { fileSystemData, type FileSystemNode, type FolderNode } from '$lib/data/file-system';
	
	// Sistema modular de comandos
	import { getCommand, getAllCommands, registerAiCommandAlias, isCommandProtected } from '$lib/terminal/commands';
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

	// Configurar renderer para abrir links en nueva pestaña y mejorar listas
	const renderer = new marked.Renderer();
	renderer.link = ({ href, title, text }) => {
		const titleAttr = title ? ` title="${title}"` : '';
		return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
	};
	
	// Mejor renderizado de listas
	renderer.list = (body, ordered) => {
		const tag = ordered ? 'ol' : 'ul';
		return `<${tag} class="terminal-list">${body.items.map(item => item.raw).join('')}</${tag}>`;
	};
	
	renderer.listitem = (text) => {
		return `<li>${text.text}</li>`;
	};
	
	marked.use({ renderer, breaks: true, gfm: true });

	// Función helper para renderizar markdown síncronamente
	function renderMarkdown(text: string): string {
		return marked.parse(text) as string;
	}

	/**
	 * Parsear línea de comando respetando comillas
	 * Ej: register user email --name "Juan Pérez" --role "Dev"
	 * Retorna: ['register', 'user', 'email', '--name', 'Juan Pérez', '--role', 'Dev']
	 */
	function parseCommandLine(input: string): string[] {
		const result: string[] = [];
		let current = '';
		let inQuotes = false;
		let quoteChar = '';

		for (let i = 0; i < input.length; i++) {
			const char = input[i];

			if ((char === '"' || char === "'") && !inQuotes) {
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar && inQuotes) {
				inQuotes = false;
				quoteChar = '';
			} else if (char === ' ' && !inQuotes) {
				if (current) {
					result.push(current);
					current = '';
				}
			} else {
				current += char;
			}
		}

		if (current) {
			result.push(current);
		}

		return result;
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
	
	// Modo verificación inline
	let isVerificationMode = $state(false);
	let verificationEmail = $state('');
	
	// Estado de autenticación
	let isAuthenticated = $state(false);

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
		
		// Verificar si hay sesión activa
		checkAuthStatus();
		
		// Limpiar terminal al abrir
		history = [];
		promptHistory = [];
		historyIndex = -1;
		isChatModeActive = false;
		isVerificationMode = false;
		verificationEmail = '';
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

		// Listeners para eventos de comandos async
		const handleTerminalOutput = (e: CustomEvent) => {
			addSystemMessage(e.detail.output);
		};
		
		const handleVerificationMode = (e: CustomEvent) => {
			isVerificationMode = true;
			verificationEmail = e.detail.email;
			addSystemMessage(`<span class="ai-info">📧 Ingresa el código de 6 dígitos enviado a <strong>${e.detail.email}</strong></span>
<span class="system-hint">Escribe el código o "cancelar" para salir</span>`);
		};
		
		// Listener para cambios de auth (login/logout)
		const handleAuthChange = () => {
			checkAuthStatus();
		};

		window.addEventListener('terminal:output', handleTerminalOutput as EventListener);
		window.addEventListener('terminal:verification-mode', handleVerificationMode as EventListener);
		window.addEventListener('auth:change', handleAuthChange);

		isInitialized = true;
		inputElement?.focus();
		
		// Cleanup
		return () => {
			window.removeEventListener('terminal:output', handleTerminalOutput as EventListener);
			window.removeEventListener('terminal:verification-mode', handleVerificationMode as EventListener);
			window.removeEventListener('auth:change', handleAuthChange);
		};
	});
	
	// Verificar estado de autenticación
	async function checkAuthStatus() {
		try {
			const response = await fetch('/api/users/me', { credentials: 'include' });
			isAuthenticated = response.ok;
		} catch {
			isAuthenticated = false;
		}
	}

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
       <span class="command-highlight">cv</span>          Descargar curriculum vitae

<span class="category-header">  🤖 Inteligencia Artificial</span>
       <span class="command-highlight">${aiCmd}</span>        ${aiNm} con modos especializados
       <span class="command-highlight">apikey</span>      Configurar tu API key de Gemini

<span class="category-header">  🔐 Cuenta & Admin</span>
       <span class="command-highlight">register</span>    Crear cuenta (obtén tu subdominio)
       <span class="command-highlight">email</span>       Ver o cambiar tu email
       <span class="command-highlight">admin</span>       Panel de administración

<span class="category-header">  🎨 Personalización</span>
       <span class="command-highlight">theme</span>       Cambiar tema de colores (7 temas)

<span class="category-header">  ⚙️ Terminal</span>
       <span class="command-highlight">cls</span>         Limpiar consola (Ctrl+L)
       <span class="command-highlight">help</span>        Mostrar ayuda completa
       <span class="command-highlight">exit</span>        Cerrar terminal (Ctrl+Ñ)

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
			setAiMode: (mode: string | null) => iaMode.set(mode),
			// Configuración dinámica
			aiCommandName: aiCommandName,
			aiDisplayName: aiDisplayName,
			ownerName: ownerName,
			// Autenticación
			isAuthenticated: isAuthenticated
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
		isVerificationMode = false;
		verificationEmail = '';
		currentPath.set('C:\\');
		iaMode.set(null);

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

		// Modo verificación inline
		if (isVerificationMode) {
			if (promptText.toLowerCase().trim() === 'cancelar' || promptText.toLowerCase().trim() === 'cancel') {
				isVerificationMode = false;
				verificationEmail = '';
				addSystemMessage('<span class="ai-warning">Verificación cancelada</span>');
				await tick();
				scrollToBottom();
				return;
			}
			
			// Intentar verificar código
			const code = promptText.trim();
			if (/^\d{6}$/.test(code)) {
				isLoading = true;
				await tick();
				scrollToBottom();
				
				try {
					const response = await fetch('/api/auth/verify-email', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ email: verificationEmail, code })
					});
					
					const data = await response.json();
					
					if (response.ok) {
						isVerificationMode = false;
						verificationEmail = '';
						sessionStorage.removeItem('pending_verification_email');
						addSystemMessage(`<span class="ai-success">✅ Email verificado exitosamente!</span>
<span class="system-hint">Tu cuenta está activa. Usa <code>admin login</code> para acceder.</span>`);
					} else {
						addSystemMessage(`<span class="error-text">❌ ${data.message || 'Código inválido'}</span>
<span class="system-hint">Intenta de nuevo o escribe "cancelar"</span>`);
					}
				} catch (error) {
					addSystemMessage('<span class="error-text">❌ Error de conexión</span>');
				}
				
				isLoading = false;
				await tick();
				scrollToBottom();
				return;
			} else {
				addSystemMessage('<span class="error-text">El código debe ser de 6 dígitos</span>');
				await tick();
				scrollToBottom();
				return;
			}
		}

		if (isChatModeActive && promptText.toLowerCase().trim() === 'exit') {
			isChatModeActive = false;
			addSystemMessage('Chau loco! 👋');
			await tick();
			scrollToBottom();
			return;
		}

		const parts = parseCommandLine(promptText.trim());
		const command = parts[0]?.toLowerCase() || '';
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
			// Verificar si el comando requiere autenticación
			if (isCommandProtected(command) && !isAuthenticated) {
				addSystemMessage(`<span class="error">🔒 El comando <code>${command}</code> requiere iniciar sesión</span>

Usa <code>admin login</code> para acceder.`);
				isLoading = false;
				await tick();
				inputElement?.focus();
				scrollToBottom();
				return;
			}
			
			const ctx = createCommandContext();
			const result = await modularCommand.execute(args, ctx);

			// Sincronizar estado del modo AI con el componente
			if (ctx.aiMode !== $iaMode) {
				iaMode.set(ctx.aiMode);
			}

			// Activar/desactivar modo chat basado en comando AI
			// Detectar si es un comando AI (ai, torvalds, assistant, o alias dinámico)
			const isAiCommand = command === 'ai' || command === 'torvalds' || command === 'assistant' || command === aiCommandName.toLowerCase();
			if (isAiCommand) {
				const subCmd = args[0]?.toLowerCase();
				// Activar modo chat si: no hay subcomando, es 'start', o no es un subcomando válido
				const validSubcommands = ['stop', 'modes', 'status', 'help', '-h'];
				if (!subCmd || subCmd === 'start' || !validSubcommands.includes(subCmd)) {
					isChatModeActive = true;
				}
				if (subCmd === 'stop') {
					isChatModeActive = false;
				}
			}

			// Si hay un prompt inicial para el chat, procesarlo
			if (result.startChatWith) {
				// Mostrar output si existe
				if (result.output) {
					addSystemMessage(result.output);
				}
				// Procesar la pregunta directa
				isLoading = false;
				await tick();
				await handleAIChat(result.startChatWith);
				inputElement?.focus();
				scrollToBottom();
				return;
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

	let promptIndicator = $derived(
		isVerificationMode
			? 'codigo:\\> '
			: isChatModeActive
				? `🤖 ${aiDisplayName} [${$iaMode || 'asistente'}]> `
				: $currentPath + '> '
	);
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
		background-color: var(--theme-bg-primary);
		backdrop-filter: blur(5px);
		border-top: 1px solid var(--theme-border);
		z-index: 1000;
		animation: slide-up 0.3s ease-out;
		font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
		font-size: 14px;
	}

	.terminal-output {
		scrollbar-width: thin;
		scrollbar-color: var(--theme-border-light) var(--theme-bg-primary);
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
		background: var(--theme-bg-tertiary);
		padding: 0.75rem;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0.5rem 0;
		border: 1px solid var(--theme-border);
	}

	:global(.ai-markdown code) {
		font-family: inherit;
		font-size: 0.95em;
	}

	:global(.ai-markdown code:not(pre code)) {
		background: var(--theme-bg-secondary);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
	}

	:global(.ai-markdown ul),
	:global(.ai-markdown ol),
	:global(.terminal-list) {
		display: block;
		clear: both;
		margin: 0.5rem 0;
		padding-left: 1.5rem;
		list-style-position: outside;
	}

	:global(.ai-markdown ul),
	:global(.terminal-list) {
		list-style-type: disc;
	}

	:global(.ai-markdown ol) {
		list-style-type: decimal;
	}

	:global(.ai-markdown li),
	:global(.terminal-list li) {
		margin-bottom: 0.25rem;
		color: var(--theme-text-primary);
		line-height: 1.5;
	}

	:global(.ai-markdown li::marker),
	:global(.terminal-list li::marker) {
		color: var(--theme-prompt); /* Verde como el prompt */
	}

	:global(.ai-markdown li strong),
	:global(.terminal-list li strong) {
		color: var(--theme-secondary); /* Color de acento para negritas en listas */
	}

	:global(.ai-markdown li code),
	:global(.terminal-list li code) {
		background: var(--theme-bg-secondary);
		color: var(--theme-warning); /* Naranja para código inline */
		padding: 0.1rem 0.4rem;
		border-radius: 3px;
	}

	/* Highlight.js estilos */
	:global(.ai-markdown pre code),
	:global(.hljs) {
		background: transparent !important;
		padding: 0 !important;
	}

	:global(.ai-markdown pre) {
		display: block;
		clear: both;
		background: var(--theme-bg-tertiary);
		padding: 0.75rem;
		border-radius: 4px;
		overflow-x: auto;
		margin: 0.5rem 0;
		border: 1px solid var(--theme-border);
	}

	:global(.ai-markdown table) {
		border-collapse: collapse;
		margin: 0.5rem 0;
		width: 100%;
		clear: both;
	}

	:global(.ai-markdown th) {
		background: var(--theme-bg-secondary);
		color: var(--theme-prompt);
		padding: 0.4rem 0.8rem;
		text-align: left;
		border: 1px solid var(--theme-border-light);
	}

	:global(.ai-markdown td) {
		padding: 0.3rem 0.8rem;
		border: 1px solid var(--theme-border);
		color: var(--theme-text-primary);
	}

	:global(.ai-markdown tr:nth-child(even)) {
		background: rgba(255, 255, 255, 0.03);
	}

	.prompt-user {
		color: var(--theme-prompt);
	}

	.prompt-error {
		color: var(--theme-error);
	}

	.system-message {
		color: var(--theme-text-muted);
		white-space: pre-wrap;
	}

	:global(.command-highlight) {
		color: var(--theme-command);
		font-weight: bold;
	}

	/* Estilos para TorvaldsAI */
	:global(.ai-header) {
		color: var(--theme-path);
	}

	:global(.ai-success) {
		color: var(--theme-success);
	}

	:global(.ai-warning) {
		color: var(--theme-warning);
	}

	:global(.ai-error) {
		color: var(--theme-error);
	}

	:global(.ai-prompt) {
		color: var(--theme-path);
		font-style: italic;
	}

	:global(.ai-prompt-active) {
		color: var(--theme-path);
		font-weight: bold;
	}

	:global(.system-header) {
		color: var(--theme-secondary);
		font-weight: bold;
	}

	:global(.system-hint) {
		color: var(--theme-text-muted);
		font-style: italic;
	}

	:global(.mode-name) {
		color: var(--theme-path);
		font-weight: bold;
	}

	:global(.folder-name) {
		color: var(--theme-warning);
	}

	:global(.file-name) {
		color: var(--theme-text-primary);
	}

	:global(.error-text) {
		color: var(--theme-error);
	}

	:global(.ascii-logo) {
		color: var(--theme-prompt);
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
		color: var(--theme-path);
		font-weight: bold;
		display: block;
		margin-top: 1rem;
		margin-bottom: 1rem;
		font-size: 0.9em;
		letter-spacing: 0.5px;
	}

	:global(.help-box) {
		color: var(--theme-info);
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
		color: var(--theme-warning);
		font-weight: bold;
	}

	.form-control-plaintext:focus {
		outline: none;
		box-shadow: none;
	}

	.typing-cursor {
		color: var(--theme-prompt);
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
