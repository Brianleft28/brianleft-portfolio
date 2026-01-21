<script lang="ts">
  import { enhance } from '$app/forms';

  interface Setting {
    id: number;
    key: string;
    value: string;
    type: string;
    category: string;
    description: string;
  }

  let { data, form } = $props();
  
  let baseSettings: Setting[] = $derived(data.settings || []);
  let editedSettings: Map<string, string> = $state(new Map());
  let settings: Setting[] = $derived(
    baseSettings.map(s => ({
      ...s,
      value: editedSettings.has(s.key) ? editedSettings.get(s.key)! : s.value
    }))
  );
  let activeCategory = $state('all');
  let saving = $state(false);

  const categories = [
    { id: 'all', label: 'Todos', icon: '📋' },
    { id: 'owner', label: 'Propietario', icon: '👤' },
    { id: 'contact', label: 'Contacto', icon: '📧' },
    { id: 'social', label: 'Redes Sociales', icon: '🔗' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
    { id: 'files', label: 'Archivos', icon: '📁' },
    { id: 'tech', label: 'Tecnología', icon: '⚙️' },
  ];

  function handleInputChange(key: string, value: string) {
    editedSettings.set(key, value);
    editedSettings = new Map(editedSettings);
  }

  function getDisplayValue(setting: Setting): string {
    return editedSettings.has(setting.key) 
      ? editedSettings.get(setting.key)! 
      : setting.value;
  }

  function hasChanges(): boolean {
    return editedSettings.size > 0;
  }

  function discardChanges() {
    editedSettings = new Map();
  }

  function filteredSettings(): Setting[] {
    if (activeCategory === 'all') return settings;
    return settings.filter(s => s.category === activeCategory);
  }

  function isJsonSetting(setting: Setting): boolean {
    return setting.type === 'json';
  }

  function formatJsonForDisplay(value: string): string {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  function getUpdatesJson(): string {
    const updates = Array.from(editedSettings.entries()).map(([key, value]) => {
      const setting = baseSettings.find(s => s.key === key);
      return { id: setting?.id, key, value };
    }).filter(u => u.id);
    return JSON.stringify(updates);
  }

  // Limpiar cambios después de guardar exitoso
  $effect(() => {
    if (form?.success) {
      editedSettings = new Map();
    }
  });
</script>

<svelte:head>
  <title>Settings | Admin</title>
</svelte:head>

<div class="settings-page">
  <header class="page-header">
    <div class="header-content">
      <h1>⚙️ Configuración del Portfolio</h1>
      <p class="subtitle">Personaliza la información que se muestra en el portfolio</p>
    </div>
    <a href="/admin/projects" class="nav-link">📁 Proyectos</a>
  </header>

  {#if data.error}
    <div class="alert alert-danger">{data.error}</div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">{form.error}</div>
  {/if}

  {#if form?.success}
    <div class="alert alert-success">✅ Cambios guardados correctamente</div>
  {/if}

  <!-- Categorías -->
  <nav class="categories">
    {#each categories as cat}
      <button 
        class="category-btn" 
        class:active={activeCategory === cat.id}
        onclick={() => activeCategory = cat.id}
      >
        <span class="icon">{cat.icon}</span>
        <span class="label">{cat.label}</span>
      </button>
    {/each}
  </nav>

  <!-- Settings Grid -->
  <div class="settings-grid">
    {#each filteredSettings() as setting (setting.id)}
      <div class="setting-card" class:modified={editedSettings.has(setting.key)}>
        <div class="setting-header">
          <code class="setting-key">{setting.key}</code>
          <span class="setting-category">{setting.category}</span>
        </div>
        
        <p class="setting-description">{setting.description || 'Sin descripción'}</p>
        
        {#if isJsonSetting(setting)}
          <textarea
            class="setting-input json"
            rows="4"
            value={formatJsonForDisplay(getDisplayValue(setting))}
            oninput={(e) => handleInputChange(setting.key, e.currentTarget.value)}
            placeholder="JSON..."
          ></textarea>
        {:else}
          <input
            type="text"
            class="setting-input"
            value={getDisplayValue(setting)}
            oninput={(e) => handleInputChange(setting.key, e.currentTarget.value)}
            placeholder={setting.key}
          />
        {/if}
      </div>
    {/each}
  </div>

  <!-- Acciones -->
  {#if hasChanges()}
    <div class="actions-bar">
      <span class="changes-count">
        {editedSettings.size} cambio{editedSettings.size > 1 ? 's' : ''} pendiente{editedSettings.size > 1 ? 's' : ''}
      </span>
      <form 
        method="POST" 
        action="?/save"
        use:enhance={() => {
          saving = true;
          return async ({ update }) => {
            await update();
            saving = false;
          };
        }}
      >
        <input type="hidden" name="updates" value={getUpdatesJson()} />
        <div class="actions">
          <button type="button" class="btn btn-secondary" onclick={discardChanges} disabled={saving}>
            Descartar
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {#if saving}
              <span class="spinner-small"></span> Guardando...
            {:else}
              💾 Guardar Cambios
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .settings-page {
    padding: 2rem;
    max-width: 1200px;
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
    font-size: 1rem;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    background: #2a2a2a;
    border-radius: 6px;
    color: #ccc;
    text-decoration: none;
    transition: all 0.2s;
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

  .categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: #1a1a1a;
    border-radius: 12px;
  }

  .category-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #2a2a2a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #aaa;
    cursor: pointer;
    transition: all 0.2s;
  }

  .category-btn:hover {
    background: #333;
    color: #fff;
  }

  .category-btn.active {
    background: #0d6efd;
    border-color: #0d6efd;
    color: #fff;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1rem;
  }

  .setting-card {
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 10px;
    padding: 1rem;
    transition: all 0.2s;
  }

  .setting-card.modified {
    border-color: #ffc107;
    box-shadow: 0 0 10px rgba(255, 193, 7, 0.2);
  }

  .setting-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .setting-key {
    font-size: 0.85rem;
    color: #4ec9b0;
    background: #0d2818;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .setting-category {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
  }

  .setting-description {
    font-size: 0.85rem;
    color: #888;
    margin-bottom: 0.75rem;
  }

  .setting-input {
    width: 100%;
    padding: 0.75rem;
    background: #0d0d0d;
    border: 1px solid #333;
    border-radius: 6px;
    color: #e0e0e0;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  .setting-input:focus {
    outline: none;
    border-color: #0d6efd;
  }

  .setting-input.json {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.8rem;
    resize: vertical;
  }

  .actions-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(30, 30, 30, 0.95);
    border-top: 1px solid #333;
    backdrop-filter: blur(10px);
    z-index: 100;
  }

  .changes-count {
    color: #ffc107;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 1rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
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

  .btn-secondary {
    background: #444;
    color: #ccc;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #555;
  }

  .spinner-small {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  form {
    display: contents;
  }
</style>
