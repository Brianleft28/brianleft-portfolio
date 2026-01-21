<script lang="ts">
  import { enhance } from '$app/forms';

  interface CvInfo {
    available: boolean;
    displayName?: string;
    downloadUrl?: string;
  }

  interface ImageInfo {
    type: string;
    filename: string;
    url: string;
  }

  let { data, form } = $props();
  
  let cvInfo: CvInfo | null = $state(data.cvInfo);
  let images: ImageInfo[] = $state(data.images || []);
  let selectedCvFile: File | null = $state(null);
  let selectedImageFile: File | null = $state(null);
  let selectedImageType = $state('avatar');
  let dragOverCv = $state(false);
  let dragOverImage = $state(false);
  let uploading = $state(false);

  const imageTypes = [
    { id: 'avatar', label: 'Avatar', icon: '👤', desc: 'Foto de perfil' },
    { id: 'logo', label: 'Logo', icon: '🏷️', desc: 'Logo del portfolio' },
    { id: 'background', label: 'Fondo', icon: '🖼️', desc: 'Imagen de fondo' },
    { id: 'project', label: 'Proyecto', icon: '📁', desc: 'Imagen de proyecto' },
  ];

  const API_URL = 'http://localhost:4000';

  function handleCvSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      selectedCvFile = input.files[0];
    }
  }

  function handleCvDrop(event: DragEvent) {
    event.preventDefault();
    dragOverCv = false;
    if (event.dataTransfer?.files?.[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        selectedCvFile = file;
      }
    }
  }

  function handleImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      selectedImageFile = input.files[0];
    }
  }

  function handleImageDrop(event: DragEvent) {
    event.preventDefault();
    dragOverImage = false;
    if (event.dataTransfer?.files?.[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        selectedImageFile = file;
      }
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getImageByType(type: string): ImageInfo | undefined {
    return images.find(img => img.type === type);
  }

  // Actualizar datos después de submit exitoso
  $effect(() => {
    if (form?.success) {
      selectedCvFile = null;
      selectedImageFile = null;
      // Recargar página para obtener datos actualizados
      setTimeout(() => window.location.reload(), 500);
    }
  });
</script>

<svelte:head>
  <title>Uploads | Admin</title>
</svelte:head>

<div class="uploads-page">
  <header class="page-header">
    <div class="header-content">
      <h1>📁 Gestión de Archivos</h1>
      <p class="subtitle">Sube y gestiona archivos del portfolio</p>
    </div>
    <a href="/admin/settings" class="nav-link">⚙️ Settings</a>
  </header>

  {#if data.error}
    <div class="alert alert-danger">{data.error}</div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">{form.error}</div>
  {/if}

  {#if form?.success}
    <div class="alert alert-success">✅ {form.message}</div>
  {/if}

  <!-- Sección CV -->
  <section class="upload-section">
    <div class="section-header">
      <h2>📄 Curriculum Vitae (CV)</h2>
      <p>El CV que los usuarios pueden descargar usando el comando <code>cv</code> en la terminal</p>
    </div>

    <div class="current-status">
      <h3>Estado Actual</h3>
      {#if cvInfo?.available}
        <div class="file-info success">
          <span class="icon">📄</span>
          <div class="details">
            <strong>{cvInfo.displayName}</strong>
            <a href="{API_URL}{cvInfo.downloadUrl}" target="_blank" class="download-link">
              ⬇️ Descargar
            </a>
          </div>
        </div>
      {:else}
        <div class="file-info warning">
          <span class="icon">📄</span>
          <div class="details">
            <strong>Sin CV cargado</strong>
            <span class="status-text">No disponible</span>
          </div>
        </div>
      {/if}
    </div>

    <form method="POST" action="?/uploadCv" enctype="multipart/form-data" use:enhance={() => {
      uploading = true;
      return async ({ update }) => {
        await update();
        uploading = false;
      };
    }}>
      <div 
        class="drop-zone" 
        class:drag-over={dragOverCv}
        class:has-file={selectedCvFile}
        ondrop={handleCvDrop}
        ondragover={(e) => { e.preventDefault(); dragOverCv = true; }}
        ondragleave={() => dragOverCv = false}
      >
        {#if selectedCvFile}
          <div class="selected-file">
            <span class="icon">📄</span>
            <div class="file-details">
              <strong>{selectedCvFile.name}</strong>
              <span>{formatFileSize(selectedCvFile.size)}</span>
            </div>
            <button type="button" class="btn-clear" onclick={() => selectedCvFile = null}>✕</button>
          </div>
        {:else}
          <div class="drop-content">
            <span class="upload-icon">📤</span>
            <p><strong>Arrastra tu CV aquí</strong></p>
            <p class="hint">o haz click para seleccionar</p>
            <p class="format-hint">Solo archivos PDF, máximo 5MB</p>
          </div>
        {/if}
        <input 
          type="file" 
          name="file" 
          accept=".pdf,application/pdf" 
          class="file-input"
          onchange={handleCvSelect}
        />
      </div>

      {#if selectedCvFile}
        <button type="submit" class="btn btn-primary" disabled={uploading}>
          {#if uploading}
            <span class="spinner"></span> Subiendo...
          {:else}
            📤 Subir CV
          {/if}
        </button>
      {/if}
    </form>
  </section>

  <!-- Sección Imágenes -->
  <section class="upload-section">
    <div class="section-header">
      <h2>🖼️ Imágenes del Portfolio</h2>
      <p>Sube imágenes para avatar, logo, fondo, etc.</p>
    </div>

    <!-- Imágenes actuales -->
    <div class="images-grid">
      {#each imageTypes as imgType}
        {@const existing = getImageByType(imgType.id)}
        <div class="image-card" class:has-image={existing}>
          <div class="image-header">
            <span class="icon">{imgType.icon}</span>
            <strong>{imgType.label}</strong>
          </div>
          
          {#if existing}
            <div class="image-preview">
              <img src="{API_URL}{existing.url}" alt={imgType.label} />
            </div>
            <form method="POST" action="?/deleteImage" use:enhance>
              <input type="hidden" name="type" value={imgType.id} />
              <button type="submit" class="btn btn-danger btn-sm">🗑️ Eliminar</button>
            </form>
          {:else}
            <div class="no-image">
              <span class="placeholder">{imgType.icon}</span>
              <p>Sin imagen</p>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Subir nueva imagen -->
    <div class="upload-image-form">
      <h3>Subir Nueva Imagen</h3>
      
      <div class="image-type-selector">
        {#each imageTypes as imgType}
          <label class="type-option" class:selected={selectedImageType === imgType.id}>
            <input 
              type="radio" 
              name="imageTypeSelector" 
              value={imgType.id}
              checked={selectedImageType === imgType.id}
              onchange={() => selectedImageType = imgType.id}
            />
            <span class="icon">{imgType.icon}</span>
            <span class="label">{imgType.label}</span>
          </label>
        {/each}
      </div>

      <form method="POST" action="?/uploadImage" enctype="multipart/form-data" use:enhance={() => {
        uploading = true;
        return async ({ update }) => {
          await update();
          uploading = false;
        };
      }}>
        <input type="hidden" name="type" value={selectedImageType} />
        
        <div 
          class="drop-zone image-drop"
          class:drag-over={dragOverImage}
          class:has-file={selectedImageFile}
          ondrop={handleImageDrop}
          ondragover={(e) => { e.preventDefault(); dragOverImage = true; }}
          ondragleave={() => dragOverImage = false}
        >
          {#if selectedImageFile}
            <div class="selected-file">
              <img 
                src={URL.createObjectURL(selectedImageFile)} 
                alt="Preview" 
                class="image-thumb"
              />
              <div class="file-details">
                <strong>{selectedImageFile.name}</strong>
                <span>{formatFileSize(selectedImageFile.size)}</span>
              </div>
              <button type="button" class="btn-clear" onclick={() => selectedImageFile = null}>✕</button>
            </div>
          {:else}
            <div class="drop-content">
              <span class="upload-icon">🖼️</span>
              <p><strong>Arrastra una imagen aquí</strong></p>
              <p class="hint">o haz click para seleccionar</p>
              <p class="format-hint">JPG, PNG, GIF, WebP - máximo 2MB</p>
            </div>
          {/if}
          <input 
            type="file" 
            name="file" 
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" 
            class="file-input"
            onchange={handleImageSelect}
          />
        </div>

        {#if selectedImageFile}
          <button type="submit" class="btn btn-primary" disabled={uploading}>
            {#if uploading}
              <span class="spinner"></span> Subiendo...
            {:else}
              📤 Subir {imageTypes.find(t => t.id === selectedImageType)?.label}
            {/if}
          </button>
        {/if}
      </form>
    </div>
  </section>
</div>

<style>
  .uploads-page {
    padding: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #e0e0e0;
  }

  .subtitle {
    color: #888;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    background: #2a2a2a;
    border-radius: 6px;
    color: #ccc;
    text-decoration: none;
  }

  .nav-link:hover {
    background: #3a3a3a;
    color: #fff;
  }

  .alert {
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .alert-danger {
    background: rgba(220, 53, 69, 0.2);
    border: 1px solid #dc3545;
    color: #ff6b6b;
  }

  .alert-success {
    background: rgba(40, 167, 69, 0.2);
    border: 1px solid #28a745;
    color: #5cb85c;
  }

  .upload-section {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .section-header {
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    color: #e0e0e0;
    margin-bottom: 0.5rem;
  }

  .section-header p {
    color: #888;
    font-size: 0.9rem;
  }

  .section-header code {
    background: #0d2818;
    color: #4ec9b0;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .current-status h3 {
    font-size: 0.85rem;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #0d0d0d;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .file-info.success {
    border-left: 3px solid #28a745;
  }

  .file-info.warning {
    border-left: 3px solid #ffc107;
  }

  .file-info .icon {
    font-size: 2rem;
  }

  .file-info .details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .download-link {
    color: #0d6efd;
    text-decoration: none;
    font-size: 0.85rem;
  }

  .download-link:hover {
    text-decoration: underline;
  }

  .status-text {
    color: #888;
    font-size: 0.85rem;
  }

  .drop-zone {
    position: relative;
    border: 2px dashed #444;
    border-radius: 10px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 1rem;
  }

  .drop-zone:hover,
  .drop-zone.drag-over {
    border-color: #0d6efd;
    background: rgba(13, 110, 253, 0.1);
  }

  .drop-zone.has-file {
    border-color: #28a745;
    background: rgba(40, 167, 69, 0.1);
  }

  .file-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .drop-content {
    pointer-events: none;
  }

  .upload-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .hint {
    color: #888;
    font-size: 0.9rem;
  }

  .format-hint {
    color: #666;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }

  .selected-file {
    display: flex;
    align-items: center;
    gap: 1rem;
    pointer-events: none;
  }

  .selected-file .icon {
    font-size: 2rem;
  }

  .selected-file .file-details {
    flex: 1;
    text-align: left;
  }

  .selected-file .file-details strong {
    display: block;
  }

  .selected-file .file-details span {
    color: #888;
    font-size: 0.85rem;
  }

  .btn-clear {
    pointer-events: auto;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
  }

  .image-thumb {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #0d6efd;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0b5ed7;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Imágenes Grid */
  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .image-card {
    background: #0d0d0d;
    border: 1px solid #333;
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
  }

  .image-card.has-image {
    border-color: #28a745;
  }

  .image-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .image-preview {
    margin-bottom: 1rem;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 150px;
    border-radius: 8px;
  }

  .no-image {
    padding: 2rem 1rem;
    color: #666;
  }

  .no-image .placeholder {
    font-size: 3rem;
    opacity: 0.3;
  }

  /* Selector de tipo */
  .upload-image-form h3 {
    font-size: 1rem;
    color: #aaa;
    margin-bottom: 1rem;
  }

  .image-type-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .type-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .type-option:hover {
    background: #333;
  }

  .type-option.selected {
    background: #0d6efd;
    border-color: #0d6efd;
  }

  .type-option input {
    display: none;
  }

  .image-drop {
    min-height: 150px;
  }
</style>
