<script lang="ts">
  import { enhance } from '$app/forms';

  interface CvInfo {
    available: boolean;
    displayName?: string;
    downloadUrl?: string;
  }

  let { data, form } = $props();
  
  let cvInfo: CvInfo | null = $derived(data.cvInfo);
  let selectedCvFile: File | null = $state(null);
  let dragOver = $state(false);
  let uploading = $state(false);

  const API_URL = 'http://localhost:4000';

  function handleCvSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      selectedCvFile = input.files[0];
    }
  }

  function handleCvDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    if (event.dataTransfer?.files?.[0]) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        selectedCvFile = file;
      }
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  $effect(() => {
    if (form?.success) {
      selectedCvFile = null;
      setTimeout(() => window.location.reload(), 500);
    }
  });
</script>

<svelte:head>
  <title>Archivos | Admin</title>
</svelte:head>

<div class="uploads-page">
  <header class="page-header">
    <h1>📄 Gestión de Archivos</h1>
    <p class="subtitle">Administra el CV descargable del portfolio</p>
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
  <section class="cv-section">
    <div class="section-header">
      <h2>📄 Curriculum Vitae</h2>
      <p class="hint">El CV que los usuarios descargan con el comando <code>cv</code> en la terminal</p>
    </div>

    <div class="cv-status">
      {#if cvInfo?.available}
        <div class="cv-card available">
          <div class="cv-icon">📄</div>
          <div class="cv-info">
            <strong>{cvInfo.displayName || 'CV cargado'}</strong>
            <span class="status">✅ Disponible</span>
          </div>
          <a href="{API_URL}{cvInfo.downloadUrl}" target="_blank" class="btn-download">
            ⬇️ Descargar
          </a>
        </div>
      {:else}
        <div class="cv-card not-available">
          <div class="cv-icon">📄</div>
          <div class="cv-info">
            <strong>Sin CV cargado</strong>
            <span class="status">⚠️ No disponible para usuarios</span>
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
        class:drag-over={dragOver}
        class:has-file={selectedCvFile}
        ondrop={handleCvDrop}
        ondragover={(e) => { e.preventDefault(); dragOver = true; }}
        ondragleave={() => dragOver = false}
        role="button"
        tabindex="0"
      >
        {#if selectedCvFile}
          <div class="selected-file">
            <span class="file-icon">📄</span>
            <div class="file-details">
              <strong>{selectedCvFile.name}</strong>
              <span class="file-size">{formatFileSize(selectedCvFile.size)}</span>
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
        <button type="submit" class="btn btn-upload" disabled={uploading}>
          {#if uploading}
            Subiendo...
          {:else}
            📤 {cvInfo?.available ? 'Reemplazar CV' : 'Subir CV'}
          {/if}
        </button>
      {/if}
    </form>
  </section>

  <section class="info-section">
    <h3>💡 Información</h3>
    <ul>
      <li>El CV se descarga cuando el usuario escribe <code>cv</code> en la terminal</li>
      <li>Nombre del archivo al descargar se configura en <a href="/admin/settings">Settings</a></li>
      <li>Solo se permite un archivo PDF</li>
    </ul>
  </section>
</div>

<style>
  .uploads-page {
    max-width: 700px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.4rem;
    color: #00ff00;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    color: #666;
    font-size: 0.85rem;
  }

  .alert {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .alert-danger {
    background: rgba(255, 85, 85, 0.1);
    border: 1px solid #ff5555;
    color: #ff5555;
  }

  .alert-success {
    background: rgba(0, 255, 0, 0.1);
    border: 1px solid #00ff00;
    color: #00ff00;
  }

  .cv-section {
    background: #0d0d1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .section-header {
    margin-bottom: 1rem;
  }

  .section-header h2 {
    font-size: 1.1rem;
    color: #00ff00;
    margin-bottom: 0.25rem;
  }

  .hint {
    font-size: 0.8rem;
    color: #666;
  }

  .hint code {
    background: rgba(0, 255, 0, 0.1);
    color: #00ff00;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.75rem;
  }

  .cv-status {
    margin-bottom: 1.25rem;
  }

  .cv-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #161622;
    border-radius: 6px;
    border: 1px solid #333;
  }

  .cv-card.available {
    border-color: #00ff00;
  }

  .cv-card.not-available {
    border-color: #ff8800;
  }

  .cv-icon {
    font-size: 2rem;
  }

  .cv-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .cv-info strong {
    color: #e0e0e0;
    font-size: 0.95rem;
  }

  .cv-info .status {
    font-size: 0.75rem;
    color: #888;
  }

  .btn-download {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid #00ff00;
    color: #00ff00;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .btn-download:hover {
    background: rgba(0, 255, 0, 0.1);
  }

  .drop-zone {
    position: relative;
    border: 2px dashed #444;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: #161622;
  }

  .drop-zone:hover {
    border-color: #00ff00;
  }

  .drop-zone.drag-over {
    border-color: #00ff00;
    background: rgba(0, 255, 0, 0.05);
  }

  .drop-zone.has-file {
    border-style: solid;
    border-color: #00ff00;
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
    font-size: 2.5rem;
    display: block;
    margin-bottom: 0.5rem;
  }

  .drop-content p {
    margin: 0.25rem 0;
    color: #888;
    font-size: 0.9rem;
  }

  .drop-content strong {
    color: #ccc;
  }

  .format-hint {
    font-size: 0.75rem !important;
    color: #555 !important;
    margin-top: 0.5rem !important;
  }

  .selected-file {
    display: flex;
    align-items: center;
    gap: 1rem;
    pointer-events: none;
  }

  .file-icon {
    font-size: 2rem;
  }

  .file-details {
    flex: 1;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .file-details strong {
    color: #00ff00;
    font-size: 0.9rem;
  }

  .file-size {
    font-size: 0.75rem;
    color: #666;
  }

  .btn-clear {
    pointer-events: auto;
    background: transparent;
    border: 1px solid #ff5555;
    color: #ff5555;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .btn-clear:hover {
    background: rgba(255, 85, 85, 0.1);
  }

  .btn-upload {
    width: 100%;
    margin-top: 1rem;
    padding: 0.75rem;
    background: #00ff00;
    color: #0d0d1a;
    border: none;
    border-radius: 6px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-upload:hover:not(:disabled) {
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
  }

  .btn-upload:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .info-section {
    background: #0d0d1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
  }

  .info-section h3 {
    font-size: 0.95rem;
    color: #888;
    margin-bottom: 0.75rem;
  }

  .info-section ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .info-section li {
    color: #666;
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .info-section code {
    background: rgba(0, 255, 0, 0.1);
    color: #00ff00;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.75rem;
  }

  .info-section a {
    color: #00ff00;
  }

  form {
    display: contents;
  }
</style>
