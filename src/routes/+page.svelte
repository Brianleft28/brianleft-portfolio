<script lang='ts'>
    import folderMainIcon from '$lib/assets/folder_main.png';
    import folderIcon from '$lib/assets/folder.png'; 
    import markdownIcon from '$lib/assets/markdown.svg';
    import FileViewer from '$lib/components/FileViewer.svelte';
    import type { FolderNode, FileSystemNode, FileNode } from '$lib/data/file-system';
	import { fileSystemData } from '$lib/data/file-system';


    let currentPathIds = $state<string[]>([]);

    let activeFileId = $state<string | null>('welcome');

    let currentDirectory = $derived(() => {
        let current: FolderNode = fileSystemData;
        for (const id of currentPathIds) {
            const nextNode = current.children?.find(child => child.id === id);
            if (nextNode && nextNode.type === 'folder') {
                current = nextNode;
            }
        }
        return current;
    });

    let currentDirectoryItems = $derived(() => currentDirectory().children || []);
   
    let activeItem = $derived(() => {
        function findFileById(node: FileSystemNode, id: string | null): FileNode | undefined {
            if (!id) return undefined;
            if (node.type !== 'folder') {
                return node.id === id ? node : undefined;
            }
            for (const child of node.children) {
                const found = findFileById(child, id);
                if (found) return found;
            }
        }
        return findFileById(fileSystemData, activeFileId);
    });

    let currentPathString = $derived(() => `C:\\${currentPathIds.join('\\')}\\${activeItem()?.name || ''}`);
    
    function handleItemClick(clickedItem: FileSystemNode) {
    if (clickedItem.type === 'folder') {
        currentPathIds = [...currentPathIds, clickedItem.id];
        activeFileId = null;
    } else {
        activeFileId = clickedItem.id;
        }
    }

    function navigateUp() {
        if (currentPathIds.length > 0) {
            currentPathIds.pop();
            activeFileId = null;
            currentPathIds = [...currentPathIds];
        }
    }

       function goToRoot() {
        currentPathIds = [];
        activeFileId = 'welcome'; 
    }
</script>

<div class="container-fluid min-vh-100 py-2 pb-5 font-monospace d-flex flex-column">
    <header class="row">
        <h3 class="col-12 mb-3">Índice de {currentPathString()}</h3>
        <hr>
    </header>
    <div class="row flex-grow-1">
        <div class="col-md-3 pe-md-4">
            {#if currentPathIds.length > 0}
            <div class="d-flex align-items-center mb-2">
                <img src={folderIcon} alt="folder icon" width="18" height="18" class="me-2" />
                <button class="btn btn-link text-decoration-none p-0" onclick={navigateUp}>..</button>
            </div>
            <div class="d-flex align-items-center mb-2">
                <img src={folderMainIcon} alt="folder icon" width="18" height="18" class="me-2" />
                <button class="btn btn-link text-decoration-none p-0" onclick={goToRoot}>[directorio principal]</button>
            </div>
            {/if}
            <div>
            {#each currentDirectoryItems() as item (item.id)}
                <div class="d-flex align-items-center mb-2">
                    <img 
                        src={item.type === 'folder' ? folderIcon : markdownIcon} 
                        alt="{item.type} icon" 
                        width="18" 
                        height="18" 
                        class="me-2" 
                    />
                    <button    
                        class:active={item.id === activeFileId}
                        class="btn btn-link text-decoration-none p-0"
                        onclick={() => handleItemClick(item)}
                    >
                        {item.name}
                    </button>
                </div>
                {/each}
            </div>
        </div> 
       <div class="col-md-7 offset-md-2">
            <div class="card bg-body-tertiary text-dark-emphasis shadow-sm h-100 border-0">
                <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center py-1" style="font-size: 0.8rem;">
                    <span>{activeItem()?.name || 'Sin archivo seleccionado'}</span>
                    <div class="d-flex gap-1">
                        <span class="badge rounded-pill bg-danger" style="width: 10px; height: 10px;"></span>
                        <span class="badge rounded-pill bg-warning" style="width: 10px; height: 10px;"></span>
                        <span class="badge rounded-pill bg-success" style="width: 10px; height: 10px;"></span>
                    </div>
                </div>
                <div class="card-body overflow-auto h-100 font-monospace p-0">
                    {#if activeItem()}
                        <FileViewer file={activeItem()!} />
                    {:else}
                        <div class="d-flex flex-column justify-content-center text-dark align-items-center h-100 opacity-70">
                            <img src={folderMainIcon} alt="Logo" width="64" class="mb-3 grayscale" style="filter: grayscale(1);" />
                            <p>Selecciona un archivo para comenzar...</p>   
                            <small class="text-dark">Usa <kbd class="bg-dark text-white">Ctrl</kbd> + <kbd class="bg-dark text-white">Ñ</kbd> para abrir la consola.</small>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>