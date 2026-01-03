<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { isTerminalVisible } from '$lib/stores/ui';
    import { currentPath } from '$lib/stores/terminal';
    import { fileSystemData, type FileSystemNode } from '$lib/data/file-system';

    // Importaciones para Markdown y Highlight
    import { Marked } from 'marked';
    import { markedHighlight } from 'marked-highlight';
    import hljs from 'highlight.js';
    import 'highlight.js/styles/github-dark.css'; // Estilo de código

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

    onMount(() => {
        const savedHistory = localStorage.getItem('terminal-history');
        const savedChatMode = localStorage.getItem('terminal-chat-mode');

        if (savedHistory) {
            history = JSON.parse(savedHistory);
            promptHistory = history
                .filter((item) => item.type === 'prompt')
                .map((item) => item.text);
            historyIndex = promptHistory.length;
        } else {
            addSystemMessage(
                "Bienvenido a la terminal de Brian Benegas. Escribe '-h' para ver los comandos."
            );
        }

        if (savedChatMode === 'true') {
            isChatModeActive = true;
        }

        inputElement?.focus();
    });

    $: if (typeof window !== 'undefined') {
        localStorage.setItem('terminal-history', JSON.stringify(history));
        localStorage.setItem('terminal-chat-mode', String(isChatModeActive));
    }

    const commands: Record<string, (args: string[]) => Promise<void>> = {
        '-h': async () => {
            const helpText = `<pre>Comandos disponibles:
<span class="command-highlight">'cd'</span>: Cambia de directorio. Usa '..' para subir un nivel.
<span class="command-highlight">'cls'</span>: Limpia la consola.
<span class="command-highlight">'ll'</span>: Ver archivos/proyectos.
<span class="command-highlight">'exit'</span>: Cierra la terminal.
<span class="command-highlight">'torvaldsai'</span>: Asistente IA experto en el portfolio, proyectos y habilidades de Brian.
</pre>`;
            addSystemMessage(helpText);
        },

        // Clave en minúsculas para facilitar la búsqueda
        torvaldsai: async (args) => {
            const initialPrompt = args.join(' ');
            isChatModeActive = true;
            
            if (!initialPrompt) {
                addSystemMessage('Pregúntame sobre los proyectos de Brian, experiencia o arquitectura de este portfolio.');
                return;
            }
            await handleAIChat(initialPrompt);
        },

        cls: async () => {
            history = [];
            promptHistory = [];
            historyIndex = -1;
            isChatModeActive = false;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('terminal-history');
                localStorage.removeItem('terminal-chat-mode');
            }
            currentPath.set('C:\\');
            addSystemMessage("Utiliza '-h' para ver los comandos disponibles.");
        },

        ll: async () => {
            const pathParts = $currentPath.split('\\').filter((p) => p && p !== 'C:');
            let currentLevel: FileSystemNode[] = fileSystemData.children;

            for (const part of pathParts) {
                const foundDir = currentLevel.find(
                    (node) => node.name.toLowerCase() === part.toLowerCase() && node.type === 'folder'
                );
                if (foundDir && foundDir.type === 'folder') {
                    currentLevel = foundDir.children;
                } else {
                    addErrorMessage(`Directorio no encontrado: ${part}`);
                    return;
                }
            }

            if (currentLevel.length === 0) {
                addSystemMessage('Directorio vacío.');
            } else {
                const listing = currentLevel
                    .map((node) => node.type === 'folder' ? `[${node.name}]` : node.name)
                    .join('\n');
                addSystemMessage(listing);
            }
        },
        
        exit: async () => { handleClose(); },

        cd: async (args) => {
            const targetDir = args[0];
            if (!targetDir) {
                addSystemMessage(`Ruta actual: ${$currentPath}`);
                return;
            }
            if (targetDir === '..') {
                const parts = $currentPath.split('\\').filter(p => p);
                if (parts.length > 1) {
                    parts.pop();
                    currentPath.set(parts.join('\\') + '\\');
                } else {
                    currentPath.set('C:\\');
                }
                return;
            }
            const parts = $currentPath.split('\\').filter(p => p);
            parts.push(targetDir);
            currentPath.set(parts.join('\\') + '\\');
        },
    };
    
    function addHistoryItem(item: HistoryItem) {
        history = [...history, item];
        if (item.type === 'prompt') {
            promptHistory = [...promptHistory, item.text];
            historyIndex = promptHistory.length;
        }
        setTimeout(() => {
            const container = terminalElement.querySelector('.terminal-output');
            container?.scrollTo(0, container.scrollHeight);
        }, 0);
    }

    function addSystemMessage(text: string) {
        addHistoryItem({ type: 'system', text });
    }

    function addErrorMessage(text: string) {
        addHistoryItem({ type: 'error', text });
    }
    
    function handleClose() {
        isChatModeActive = false;
        isTerminalVisible.set(false);
    }

    async function handleSubmit() {
        if (isLoading || !currentPrompt.trim()) return;
        
        const promptText = currentPrompt;
        addHistoryItem({ type: 'prompt', text: promptText, promptIndicator });
        currentPrompt = '';

        if (isChatModeActive && promptText.toLowerCase().trim() === 'exit') {
            isChatModeActive = false; 
            addSystemMessage('Bye!'); 
            await tick();
            terminalElement.scrollTop = terminalElement.scrollHeight;
            return; 
        }

        isLoading = true;
        await tick();
        terminalElement.scrollTop = terminalElement.scrollHeight;

        // Normalizamos el comando a minúsculas, pero guardamos los argumentos
        const parts = promptText.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        const commandHandler = commands[command];

        if (commandHandler && command !== 'torvaldsai') { 
            await commandHandler(args);
        } else if (isChatModeActive || command === 'torvaldsai') {
            const promptForAI = command === 'torvaldsai' ? args.join(' ') : promptText;
            
            if (promptForAI) {
                await handleAIChat(promptForAI);
            } else if (command === 'torvaldsai') {
                isChatModeActive = true;
                addSystemMessage('TorvaldsAi iniciado. Pregúntame sobre los proyectos de Brian, experiencia o arquitectura de este portfolio.');
            }
        } else {
            addErrorMessage(`Comando no reconocido: '${command}'. Escribe '-h' para ver la lista.`);
        }
        
        isLoading = false;
        await tick();
        inputElement.focus();
        terminalElement.scrollTop = terminalElement.scrollHeight;
    }

    async function handleAIChat(prompt: string) {
        const responseIndex = history.length;
        addHistoryItem({ type: 'response', text: '' });

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt
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

                const chunk = decoder.decode(value, { stream: true }).replace(/\n{3,}/g, '\n\n').trim();
                history[responseIndex].text += chunk;
                history = history;
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error en el chat con IA:', error);
            history[responseIndex].text = 'Kernel Panic: No se pudo conectar con el núcleo cognitivo.';
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
            terminalElement?.querySelector('.terminal-output')?.scrollTo(0, terminalElement.scrollHeight);
        });
    }

    $: promptIndicator = isChatModeActive
        ? `TorvaldsAi>` 
        : $currentPath + '>';
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
        <button class="btn-close btn-white" on:click={handleClose} aria-label="Cerrar Terminal"></button>
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
                <div class="line mb-2 clearfix">
                    {#if item.type === 'prompt'}
                        <span class="prompt-user">{promptIndicator}</span>
                        <span>{item.text}</span>
                    {:else if item.type === 'response'}
                        <!-- Contenedor de respuesta IA -->
                        <div class="ai-response-wrapper">
                            <span class="prompt-torvalds">TorvaldsAi:</span>
                            <div class="ai-markdown">
                                {@html renderMarkdown(item.text)}
                            </div>
                        </div>
                    {:else if item.type === 'error'}
                        <p class="prompt-error">{item.text}</p>
                    {:else if item.type === 'system'}
                        <div class="system-message">{@html item.text}</div>
                    {/if}
                </div>
            {/each}
            {#if isLoading}
                <div class="line mb-2">
                    <span class="thinking ms-1">...</span>
                </div>
            {/if}
        </div>

        <div class="input-line d-flex align-items-center">
            <span class="prompt-user me-2">{promptIndicator}</span>
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
        background-color: rgba(26, 26, 26, 0.95);
        backdrop-filter: blur(5px);
        border-top: 1px solid #444;
        z-index: 1000;
        animation: slide-up 0.3s ease-out;
        font-family: 'Consolas', 'Courier New', monospace;
    }
    .terminal-output {
        scrollbar-width: thin;
        scrollbar-color: #555 #333;
    }
    .line p,
    .line div {
        white-space: pre-wrap;
        word-break: break-word;
    }
    
    /* Estilos para la respuesta IA */
    .ai-response-wrapper {
        display: block;
        width: 100%;
    }

    .prompt-torvalds {
        color: #569cd6; /* Azul estilo VS Code */
        margin-right: 0.5rem;
        font-weight: bold;
        float: left; /* Flota a la izquierda para que el texto lo envuelva */
    }

    .ai-markdown {
        color: #e0e0e0;
        line-height: 1.6;
        text-align: justify; /* Justificado como Word */
        display: inline; /* Permite que el texto fluya junto al float */
    }

    /* Ajustes para elementos generados por Markdown dentro del flujo */
    :global(.ai-markdown p) {
        margin: 0;
        display: inline; /* El primer párrafo se comporta como texto continuo */
    }
    
    /* Si hay múltiples párrafos, forzamos bloque a partir del segundo para dar espacio */
    :global(.ai-markdown p + p) {
        display: block;
        margin-top: 0.8rem;
    }

    /* Bloques de código: rompen el flujo justificado para verse bien */
    :global(.ai-markdown pre) {
        display: block;
        clear: both; /* Baja a una nueva línea */
        background: #1e1e1e;
        padding: 1rem;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1rem 0;
        border: 1px solid #333;
        text-align: left; /* El código siempre a la izquierda */
    }

    :global(.ai-markdown code) {
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 0.9em;
    }

    /* Listas dentro de la respuesta */
    :global(.ai-markdown ul), :global(.ai-markdown ol) {
        display: block;
        clear: both;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        padding-left: 2rem;
        text-align: left;
    }

    .prompt-user {
        color: #39c539;
        margin-right: 0.5rem;
    }
    .prompt-error {
        color: #f44747;
        margin-right: 0.5rem;
    }
    .system-message {
        color: #808080;
    }
    :global(.command-highlight) {
        color: #9cdcfe;
        font-weight: bold;
    }
    .form-control-plaintext:focus {
        outline: none;
        box-shadow: none;
    }
    .thinking {
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