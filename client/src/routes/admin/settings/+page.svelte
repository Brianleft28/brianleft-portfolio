<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  interface Setting {
    id: number;
    key: string;
    value: string;
    type: string;
    category: string;
    description: string;
  }

  interface UserInfo {
    id: number;
    username: string;
    email: string | null;
    displayName: string | null;
    subdomain: string | null;
    role: string;
    createdAt: string;
  }

  let { data, form } = $props();
  
  let baseSettings: Setting[] = $derived(data.settings || []);
  let user: UserInfo | null = $derived(data.user || null);
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
  
  // Estado para copiar subdominio
  let copiedSubdomain = $state(false);
  
  // Estado para editar email
  let userEmail = $state('');
  let emailChanged = $derived(user ? userEmail !== (user.email || '') : false);
  let savingEmail = $state(false);
  let emailSaved = $state(false);
  let emailError = $state('');

  // Inicializar email cuando carga el user
  $effect(() => {
    if (user && userEmail === '') {
      userEmail = user.email || '';
    }
  });

  async function saveUserEmail() {
    if (!user || !emailChanged) return;
    
    savingEmail = true;
    emailError = '';
    emailSaved = false;
    
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: userEmail })
      });
      
      if (response.ok) {
        emailSaved = true;
        setTimeout(() => emailSaved = false, 3000);
      } else {
        const data = await response.json();
        emailError = data.message || 'Error al guardar el email';
      }
    } catch (e) {
      emailError = 'Error de conexión';
    } finally {
      savingEmail = false;
    }
  }
  
  function copySubdomain() {
    if (user?.subdomain) {
      const domain = data.portfolioDomain || 'portfolio.dev';
      const fullUrl = `https://${user.subdomain}.${domain}`;
      navigator.clipboard.writeText(fullUrl);
      copiedSubdomain = true;
      setTimeout(() => copiedSubdomain = false, 2000);
    }
  }

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

  const categoryLabels: Record<string, { labelKey: string; icon: string }> = {
    owner: { labelKey: 'admin.settings.tabs.personal', icon: '👤' },
    contact: { labelKey: 'admin.settings.tabs.contact', icon: '📧' },
    social: { labelKey: 'admin.settings.tabs.social', icon: '🔗' },
    branding: { labelKey: 'admin.settings.tabs.branding', icon: '🎨' },
    ai: { labelKey: 'admin.settings.tabs.ai', icon: '🤖' },
  };

  // Settings que se ocultan en la UI (se manejan de otra forma)
  const hiddenSettings = ['branding_ascii_banner', 'ascii_banner'];

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
    <h1>⚙️ {$_('admin.settings.title')}</h1>
    <p class="subtitle">{$_('admin.settings.subtitle')}</p>
  </header>

  {#if data.error}
    <div class="alert alert-danger">{data.error}</div>
  {/if}

  {#if form?.error}
    <div class="alert alert-danger">{form.error}</div>
  {/if}

  {#if form?.success}
    <div class="alert alert-success">✅ {$_('admin.settings.saved')}</div>
  {/if}

  <!-- Account Info Section -->
  {#if user}
    <section class="account-section">
      <h2>🔐 {$_('admin.settings.your_account')}</h2>
      <div class="account-grid">
        <div class="account-field">
          <span class="field-label">{$_('admin.settings.user')}</span>
          <div class="readonly-value">
            <span>{user.username}</span>
          </div>
        </div>

        <div class="account-field">
          <span class="field-label">{$_('admin.settings.subdomain')}</span>
          <div class="subdomain-display">
            <span class="subdomain-url">
              <span class="protocol">https://</span>
              <span class="subdomain-name">{user.subdomain || user.username}</span>
              <span class="domain">.{data.portfolioDomain || 'portfolio.dev'}</span>
            </span>
            <button
              type="button"
              class="btn-copy"
              onclick={copySubdomain}
              title="Copiar URL"
            >
              {copiedSubdomain ? '✅' : '📋'}
            </button>
          </div>
          <span class="field-hint">{$_('admin.settings.subdomain_readonly')}</span>
        </div>

        <div class="account-field">
          <label for="user_email">{$_('admin.settings.email')}</label>
          <div class="email-field-wrapper">
            <input
              id="user_email"
              type="email"
              class="setting-input"
              value={userEmail}
              placeholder="tu@email.com"
              onchange={(e) => userEmail = (e.target as HTMLInputElement).value}
            />
            {#if emailChanged}
              <button
                type="button"
                class="btn-save-email"
                onclick={saveUserEmail}
                disabled={savingEmail}
              >
                {savingEmail ? '⏳' : '💾'} {$_('common.save')}
              </button>
            {/if}
          </div>
          {#if emailSaved}
            <span class="field-hint success">✅ {$_('admin.settings.email_updated')}</span>
          {:else if emailError}
            <span class="field-hint error">{emailError}</span>
          {:else}
            <span class="field-hint">{$_('admin.settings.email_help')}</span>
          {/if}
        </div>

        <div class="account-field">
          <span class="field-label">{$_('admin.settings.role')}</span>
          <div class="readonly-value">
            <span class="role-badge" class:admin={user.role === 'admin'}>
              {user.role === 'admin' ? '👑 ' + $_('admin.settings.role_admin') : '👤 ' + $_('admin.settings.role_user')}
            </span>
          </div>
        </div>

        <div class="account-field">
          <span class="field-label">{$_('admin.settings.member_since')}</span>
          <div class="readonly-value">
            <span>{new Date(user.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Settings por categoría -->
  {#each groupedSettings as [category, categorySettings]}
    {@const catInfo = categoryLabels[category] || { labelKey: category, icon: '📋' }}
    {@const visibleSettings = categorySettings.filter(s => !hiddenSettings.includes(s.key))}
    {#if visibleSettings.length > 0}
    <section class="settings-section">
      <h2>{catInfo.icon} {catInfo.labelKey ? $_(`${catInfo.labelKey}`) : category}</h2>
      
      <div class="settings-list">
        {#each visibleSettings as setting (setting.id)}
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
    {/if}
  {/each}

  {#if settings.length === 0}
    <div class="empty-state">
      <p>{$_('admin.settings.no_settings')}</p>
      <p class="hint">{$_('admin.settings.run_seeders')}</p>
    </div>
  {/if}

  {#if hasChanges()}
    <div class="actions-bar">
      <span class="changes-count">
        {editedSettings.size} {editedSettings.size > 1 ? $_('admin.settings.changes') : $_('admin.settings.change')}
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
            {$_('admin.settings.discard')}
          </button>
          <button type="submit" class="btn btn-save" disabled={saving}>
            {#if saving}{$_('common.saving')}{:else}💾 {$_('common.save')}{/if}
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
    padding-bottom: 80px;
    font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-header h1 {
    font-size: 1.5rem;
    color: var(--theme-accent);
    margin-bottom: 0.25rem;
    font-weight: 600;
  }

  .subtitle {
    color: var(--theme-text-secondary);
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
    border: 1px solid var(--theme-error);
    color: var(--theme-error);
  }

  .alert-success {
    background: var(--theme-accent-subtle);
    border: 1px solid var(--theme-accent);
    color: var(--theme-accent);
  }

  .hint {
    font-size: 0.85rem;
    color: var(--theme-text-muted);
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }

  .settings-section {
    background: var(--theme-bg-secondary);
    border: 1px solid var(--theme-border);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .settings-section h2 {
    font-size: 1.05rem;
    color: var(--theme-accent);
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--theme-border);
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
    background: var(--theme-accent-subtle);
  }

  .setting-row.modified {
    background: var(--theme-accent-subtle);
    border-left: 2px solid var(--theme-accent);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .setting-info label {
    color: var(--theme-text-primary);
    font-size: 0.9rem;
    font-weight: 600;
  }

  .setting-hint {
    font-size: 0.8rem;
    color: var(--theme-text-muted);
    line-height: 1.4;
  }

  .setting-input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: var(--theme-bg-input);
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    color: var(--theme-text-primary);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .setting-input:focus {
    outline: none;
    border-color: var(--theme-accent);
    box-shadow: 0 0 8px var(--theme-accent-glow);
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
    color: var(--theme-info);
    text-transform: capitalize;
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--theme-text-muted);
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
    background: var(--theme-bg-primary);
    border-top: 1px solid var(--theme-accent);
    backdrop-filter: blur(10px);
    z-index: 100;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  .changes-count {
    color: var(--theme-accent);
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
    background: transparent;
    border: 1px solid var(--theme-accent);
    color: var(--theme-accent);
    font-weight: 600;
  }

  .btn-save:hover:not(:disabled) {
    background: var(--theme-accent);
    color: var(--theme-bg-primary);
    box-shadow: 0 0 15px var(--theme-accent-glow);
  }

  .btn-cancel {
    background: transparent;
    border: 1px solid var(--theme-error);
    color: var(--theme-error);
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

  /* Account Section Styles */
  .account-section {
    background: linear-gradient(135deg, var(--theme-bg-primary) 0%, var(--theme-bg-secondary) 100%);
    border: 1px solid var(--theme-accent);
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 0 20px var(--theme-accent-glow);
  }

  .account-section h2 {
    font-size: 1.1rem;
    color: var(--theme-accent);
    margin-bottom: 1rem;
    font-weight: 600;
    border-bottom: 1px solid var(--theme-accent-glow);
    padding-bottom: 0.5rem;
  }

  .account-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
  }

  .account-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .account-field > label,
  .account-field > .field-label {
    font-size: 0.8rem;
    color: var(--theme-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .readonly-value {
    padding: 0.6rem 0.8rem;
    background: var(--theme-accent-subtle);
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    color: var(--theme-text-primary);
    font-size: 0.95rem;
  }

  .subdomain-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    background: var(--theme-accent-subtle);
    border: 1px solid var(--theme-accent-glow);
    border-radius: 4px;
  }

  .subdomain-url {
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 0.9rem;
    flex: 1;
  }

  .subdomain-url .protocol {
    color: var(--theme-text-muted);
  }

  .subdomain-url .subdomain-name {
    color: var(--theme-accent);
    font-weight: 600;
  }

  .subdomain-url .domain {
    color: var(--theme-text-secondary);
  }

  .btn-copy {
    padding: 0.3rem 0.5rem;
    background: transparent;
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.85rem;
  }

  .btn-copy:hover {
    background: var(--theme-accent-subtle);
    border-color: var(--theme-accent);
  }

  .field-hint {
    font-size: 0.75rem;
    color: var(--theme-text-muted);
    font-style: italic;
  }

  .field-hint.success {
    color: var(--theme-success, #4ade80);
    font-style: normal;
  }

  .field-hint.error {
    color: var(--theme-error, #f87171);
    font-style: normal;
  }

  .email-field-wrapper {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .email-field-wrapper .setting-input {
    flex: 1;
  }

  .btn-save-email {
    padding: 0.5rem 0.75rem;
    background: var(--theme-accent);
    border: 1px solid var(--theme-accent);
    border-radius: 4px;
    cursor: pointer;
    color: var(--theme-bg-primary);
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-save-email:hover:not(:disabled) {
    background: var(--theme-accent-glow);
    border-color: var(--theme-accent-glow);
  }

  .btn-save-email:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    background: var(--theme-accent-subtle);
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .role-badge.admin {
    background: rgba(255, 215, 0, 0.15);
    color: var(--theme-warning);
  }

  @media (max-width: 700px) {
    .setting-row {
      grid-template-columns: 1fr;
    }
    
    .account-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
