<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { isTerminalVisible } from '$lib/stores/ui';
    import { currentPath } from '$lib/stores/terminal';
    import { fileSystemData, type FileSystemNode } from '$lib/data/file-system';

    type HistoryItem = {
        type: 'prompt' | 'response' | 'error' | 'system';
        text: string;
        promptIndicator?: string;
    };

    let history: HistoryItem[] = ['"Bienvenido a la terminal de Brian Benegas. Escribe \'-h\' para ver los comandos."'].map(text => ({ type: 'system', text }));
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
<span class="command-highlight">'soren_chat'</span>: Conversa con mi asistente de IA, sabe todos sobre mis cualidades y proyectos.
</pre>`;
        addSystemMessage(helpText);
    },

    cls: async () => {
        history = [];
        promptHistory = [];
        historyIndex = -1;
        isChatModeActive = false;
        // Limpiamos también el localStorage
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

       soren_chat: async (args) => {
        const initialPrompt = args.join(' ');
        if (!initialPrompt) {
            isChatModeActive = true;
            addSystemMessage(
                'Modo de chat general activado. Ahora podés conversar con Søren.'
            );
            return;
        }
        
        // Si hay un mensaje, activamos el modo y lo enviamos directamente
        isChatModeActive = true;
        await handleAIChat(initialPrompt);
    }
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
    // Pasamos el promptIndicator actual para que se guarde con el historial
    addHistoryItem({ type: 'prompt', text: promptText, promptIndicator });
    currentPrompt = '';
    isLoading = true;

    await tick();
    terminalElement.scrollTop = terminalElement.scrollHeight;

    const [command, ...args] = promptText.toLowerCase().trim().split(' ');
    const commandHandler = commands[command];

    if (commandHandler && command !== 'soren_chat') {
        await commandHandler(args);
    } else if (isChatModeActive || command === 'soren_chat') {
        const promptForAI = command === 'soren_chat' ? args.join(' ') : promptText;
        if (promptForAI) {
            await handleAIChat(promptForAI);
        } else if (command === 'soren_chat') {
            isChatModeActive = true;
            addSystemMessage('Modo de chat general activado. Ahora podés conversar con Søren.');
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
        history[responseIndex].text = 'Error: No se pudo conectar con el núcleo cognitivo.';
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
            // Si llegamos al final, limpiamos el prompt
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
? `Søren-Chat>` 
: $currentPath + '>';
</script>


<!-- svelte-ignore a11y-autofocus -->
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
                <div class="line mb-2">
                    {#if item.type === 'prompt'}
                        <span class="prompt-user">{promptIndicator}</span>
                        <span>{item.text}</span>
                    {:else if item.type === 'response'}
                        <div>
                            <span class="prompt-soren">Søren:</span>
                            <span class="ms-1">{@html item.text}</span>
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

        <div class="terminal-input d-flex align-items-center mt-2">
            <span class="prompt-user">{promptIndicator}</span>
            <input
                bind:this={inputElement}
                bind:value={currentPrompt}
                on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
                type="text"
                class="form-control-plaintext bg-transparent text-light flex-grow-1"
                spellcheck="false"
                autocomplete="off"
                disabled={isLoading}
                autofocus
            />
        </div>
    </div>
</div>

<style>
    .terminal-overlay {
        height: 70vh;
        background-color: rgba(26, 26, 26, 0.9);
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
    .prompt-user {
        color: #39c539;
        margin-right: 0.5rem;
    }
    .prompt-soren {
        color: #d7ba7d;
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