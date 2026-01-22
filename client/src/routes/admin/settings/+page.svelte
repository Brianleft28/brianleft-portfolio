<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';

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
  let saving = $state(false);
  let asciiBanner = $state('');
  let loadingBanner = $state(false);

  // Agrupar settings por categoría
  let groupedSettings = $derived.by(() => {
    const groups: Record<string, Setting[]> = {};
    for (const s of settings) {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    }
    // Ordenar categorías
    const order = ['owner', 'contact', 'social', 'branding', 'ai'];
    const sorted: [string, Setting[]][] = [];
    for (const cat of order) {
      if (groups[cat]) sorted.push([cat, groups[cat]]);
    }
    // Agregar cualquier otra categoría no listada
    for (const [cat, items] of Object.entries(groups)) {
      if (!order.includes(cat)) sorted.push([cat, items]);
    }
    return sorted;
  });

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    owner: { label: 'Información Personal', icon: '👤' },
    contact: { label: 'Contacto', icon: '📧' },
    social: { label: 'Redes Sociales', icon: '🔗' },
    branding: { label: 'Branding & Apariencia', icon: '🎨' },
    ai: { label: 'Asistente IA (Fallback)', icon: '🤖' },
  };

  // Helper para detectar si un valor es JSON parseable
  function isJsonValue(value: string): boolean {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  }

  // Helper para parsear JSON de forma segura
  function parseJsonSafe(value: string): Record<string, string> {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  // Maneja cambios en campos JSON individuales
  function handleJsonFieldChange(settingKey: string, fieldKey: string, fieldValue: string) {
    const setting = baseSettings.find(s => s.key === settingKey);
    if (!setting) return;
    
    const currentValue = editedSettings.has(settingKey) 
      ? editedSettings.get(settingKey)! 
      : setting.value;
    
    const parsed = parseJsonSafe(currentValue);
    parsed[fieldKey] = fieldValue;
    
    editedSettings.set(settingKey, JSON.stringify(parsed));
    editedSettings = new Map(editedSettings);
  }

  // Obtiene valor de un campo JSON específico
  function getJsonFieldValue(setting: Setting, fieldKey: string): string {
    const currentValue = editedSettings.has(setting.key) 
      ? editedSettings.get(setting.key)! 
      : setting.value;
    const parsed = parseJsonSafe(currentValue);
    return parsed[fieldKey] || '';
  }

  function handleInputChange(key: string, value: string) {
    editedSettings.set(key, value);
    editedSettings = new Map(editedSettings);
  }

  function getDisplayValue(setting: Setting): string {
    return editedSettings.has(setting.key) ? editedSettings.get(setting.key)! : setting.value;
  }

  function hasChanges(): boolean {
    return editedSettings.size > 0;
  }

  function discardChanges() {
    editedSettings = new Map();
  }

  function getUpdatesJson(): string {
    const updates = Array.from(editedSettings.entries()).map(([key, value]) => {
      const setting = baseSettings.find(s => s.key === key);
      return { id: setting?.id, key, value };
    }).filter(u => u.id);
    return JSON.stringify(updates);
  }

  function formatKeyForDisplay(key: string): string {
    return key
      .replace(/^(owner_|contact_|social_|branding_)/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Debounce timer para preview del banner
  let bannerPreviewTimeout: ReturnType<typeof setTimeout> | null = null;

  // Actualizar preview del banner cuando cambian campos de nombre
  function handleNameFieldChange(key: string, value: string) {
    handleInputChange(key, value);
    
    // Si es un campo de nombre, hacer preview del banner con debounce
    if (key === 'owner_name' || key === 'owner_first_name' || key === 'owner_last_name') {
      if (bannerPreviewTimeout) clearTimeout(bannerPreviewTimeout);
      
      bannerPreviewTimeout = setTimeout(() => {
        // Calcular nombre completo
        let fullName = '';
        if (key === 'owner_name') {
          fullName = value;
        } else {
          const firstName = key === 'owner_first_name' 
            ? value 
            : (editedSettings.get('owner_first_name') || settings.find(s => s.key === 'owner_first_name')?.value || '');
          const lastName = key === 'owner_last_name'
            ? value
            : (editedSettings.get('owner_last_name') || settings.find(s => s.key === 'owner_last_name')?.value || '');
          fullName = `${firstName} ${lastName}`.trim();
        }
        
        if (fullName) {
          previewAsciiBanner(fullName);
        }
      }, 500); // 500ms de debounce
    }
  }

  $effect(() => {
    if (form?.success) {
      editedSettings = new Map();
      loadAsciiBanner();
    }
  });

  async function loadAsciiBanner() {
    loadingBanner = true;
    try {
      const response = await fetch('/api/settings/banner');
      if (response.ok) {
        const res = await response.json();
        asciiBanner = res.ascii_banner || '';
      }
    } catch (e) {
      console.error('Error loading banner:', e);
    } finally {
      loadingBanner = false;
    }
  }

  async function previewAsciiBanner(text: string) {
    if (!text.trim()) return;
    loadingBanner = true;
    try {
      const response = await fetch('/api/settings/banner/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const res = await response.json();
        asciiBanner = res.ascii_banner || '';
      }
    } catch (e) {
      console.error('Error previewing banner:', e);
    } finally {
      loadingBanner = false;
    }
  }

  onMount(() => {
    loadAsciiBanner();
  });
</script>

<svelte:head>
  <title>Configuración | Admin</title>
</svelte:head>

<div class="settings-page">
  <header class="page-header">
    <h1>⚙️ Configuración del Portfolio</h1>
    <p class="subtitle">Personaliza toda la información de tu portfolio white-label</p>
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

  <!-- ASCII Banner Preview -->
  <section class="ascii-section">
    <h2>🎨 Banner ASCII</h2>
    <p class="hint">Se genera automáticamente con tu nombre al guardar</p>
    <div class="ascii-preview">
      {#if loadingBanner}
        <span class="loading-text">Generando...</span>
      {:else if asciiBanner}
        <pre>{asciiBanner}</pre>
      {:else}
        <span class="no-banner">Sin banner - Guarda tu nombre para generarlo</span>
      {/if}
    </div>
    <button 
      type="button" 
      class="btn-regenerate"
      onclick={() => {
        const ownerName = settings.find(s => s.key === 'owner_name')?.value || '';
        if (ownerName) previewAsciiBanner(ownerName);
      }}
      disabled={loadingBanner}
    >
      🔄 Regenerar
    </button>
  </section>

  <!-- Settings por categoría -->
  {#each groupedSettings as [category, categorySettings]}
    {@const catInfo = categoryLabels[category] || { label: category, icon: '📋' }}
    <section class="settings-section">
      <h2>{catInfo.icon} {catInfo.label}</h2>
      
      <div class="settings-list">
        {#each categorySettings as setting (setting.id)}
          <div class="setting-row" class:modified={editedSettings.has(setting.key)}>
            <div class="setting-info">
              <label for={setting.key}>{formatKeyForDisplay(setting.key)}</label>
              {#if setting.description}
                <span class="setting-hint">{setting.description}</span>
              {/if}
            </div>
            
            {#if setting.type === 'json' && isJsonValue(setting.value)}
              <!-- Renderizar campos JSON como inputs separados -->
              {@const jsonFields = Object.entries(parseJsonSafe(setting.value))}
              <div class="json-fields">
                {#each jsonFields as [fieldKey, _]}
                  {@const fieldId = `${setting.key}_${fieldKey}`}
                  <div class="json-field">
                    <label class="json-field-label" for={fieldId}>{fieldKey}</label>
                    {#if fieldKey === 'long' || getJsonFieldValue(setting, fieldKey).length > 80}
                      <textarea
                        id={fieldId}
                        class="setting-input"
                        rows="2"
                        value={getJsonFieldValue(setting, fieldKey)}
                        oninput={(e) => handleJsonFieldChange(setting.key, fieldKey, e.currentTarget.value)}
                        placeholder={fieldKey}
                      ></textarea>
                    {:else}
                      <input
                        id={fieldId}
                        type="text"
                        class="setting-input"
                        value={getJsonFieldValue(setting, fieldKey)}
                        oninput={(e) => handleJsonFieldChange(setting.key, fieldKey, e.currentTarget.value)}
                        placeholder={fieldKey}
                      />
                    {/if}
                  </div>
                {/each}
              </div>
            {:else if setting.type === 'text' || setting.value.length > 100}
              <textarea
                id={setting.key}
                class="setting-input"
                rows="3"
                value={getDisplayValue(setting)}
                oninput={(e) => ['owner_name', 'owner_first_name', 'owner_last_name'].includes(setting.key) 
                  ? handleNameFieldChange(setting.key, e.currentTarget.value)
                  : handleInputChange(setting.key, e.currentTarget.value)}
                placeholder={formatKeyForDisplay(setting.key)}
              ></textarea>
            {:else}
              <input
                id={setting.key}
                type="text"
                class="setting-input"
                value={getDisplayValue(setting)}
                oninput={(e) => ['owner_name', 'owner_first_name', 'owner_last_name'].includes(setting.key)
                  ? handleNameFieldChange(setting.key, e.currentTarget.value)
                  : handleInputChange(setting.key, e.currentTarget.value)}
                placeholder={formatKeyForDisplay(setting.key)}
              />
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/each}

  {#if settings.length === 0}
    <div class="empty-state">
      <p>No hay configuraciones disponibles.</p>
      <p class="hint">Ejecuta los seeders para cargar la configuración inicial.</p>
    </div>
  {/if}

  {#if hasChanges()}
    <div class="actions-bar">
      <span class="changes-count">
        {editedSettings.size} cambio{editedSettings.size > 1 ? 's' : ''} sin guardar
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
          <button type="button" class="btn btn-cancel" onclick={discardChanges} disabled={saving}>
            Descartar
          </button>
          <button type="submit" class="btn btn-save" disabled={saving}>
            {#if saving}Guardando...{:else}💾 Guardar{/if}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  .settings-page {
    max-width: 900px;
    margin: 0 auto;
    font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
    color: #00ff00;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .subtitle {
    color: #aaa;
    font-size: 0.9rem;
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

  .ascii-section {
    background: #0d0d1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .ascii-section h2 {
    font-size: 1.05rem;
    color: #00ff00;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .hint {
    font-size: 0.85rem;
    color: #999;
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }

  .ascii-preview {
    background: #000;
    border: 1px solid #00ff00;
    border-radius: 4px;
    padding: 1rem;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-x: auto;
  }

  .ascii-preview pre {
    color: #00ff00;
    font-family: 'Consolas', monospace;
    font-size: 0.5rem;
    line-height: 1.1;
    margin: 0;
  }

  .loading-text, .no-banner {
    color: #999;
    font-style: italic;
    font-size: 0.9rem;
  }

  .btn-regenerate {
    margin-top: 0.75rem;
    padding: 0.4rem 0.8rem;
    background: transparent;
    border: 1px solid #444;
    color: #999;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-family: 'Segoe UI', system-ui, sans-serif;
    transition: all 0.2s;
  }

  .btn-regenerate:hover:not(:disabled) {
    border-color: #00ff00;
    color: #00ff00;
  }

  .settings-section {
    background: #0d0d1a;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .settings-section h2 {
    font-size: 1.05rem;
    color: #00ff00;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #222;
    font-weight: 600;
  }

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .setting-row {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 1rem;
    align-items: start;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .setting-row:hover {
    background: rgba(0, 255, 0, 0.02);
  }

  .setting-row.modified {
    background: rgba(0, 255, 0, 0.05);
    border-left: 2px solid #00ff00;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .setting-info label {
    color: #e0e0e0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .setting-hint {
    font-size: 0.8rem;
    color: #999;
    line-height: 1.4;
  }

  .setting-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: #161622;
    border: 1px solid #333;
    border-radius: 4px;
    color: #e0e0e0;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .setting-input:focus {
    outline: none;
    border-color: #00ff00;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.15);
  }

  textarea.setting-input {
    resize: vertical;
    min-height: 50px;
  }

  /* Estilos para campos JSON */
  .json-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .json-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .json-field-label {
    font-size: 0.8rem;
    color: #4ec9b0;
    text-transform: capitalize;
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #999;
    font-size: 0.95rem;
  }

  .actions-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 2rem;
    background: rgba(13, 13, 26, 0.98);
    border-top: 1px solid #00ff00;
    backdrop-filter: blur(10px);
    z-index: 100;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  .changes-count {
    color: #00ff00;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.5rem 1.1rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-save {
    background: #00ff00;
    color: #0d0d1a;
    font-weight: 600;
  }

  .btn-save:hover:not(:disabled) {
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid #ff5555;
    color: #ff5555;
  }

  .btn-cancel:hover:not(:disabled) {
    background: rgba(255, 85, 85, 0.1);
  }

  form {
    display: contents;
  }

  /* Estilos para alertas */
  .alert {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 0.9rem;
  }

  @media (max-width: 700px) {
    .setting-row {
      grid-template-columns: 1fr;
    }
  }
</style>
