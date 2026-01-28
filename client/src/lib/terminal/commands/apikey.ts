import type { Command } from '../types';
import { saveGeminiApiKey, loadGeminiApiKey } from '$lib/stores/config';

/**
 * Comando para configurar la API key de Gemini
 * Se guarda en localStorage para que el usuario tenga control total
 */
export const apikey: Command = {
	name: 'apikey',
	description: 'Configura tu API key de Gemini (se guarda en localStorage)',
	usage: 'apikey [set <key> | show | clear | help]',

	execute(args) {
		const subcommand = args[0]?.toLowerCase();

		if (!subcommand || subcommand === 'help' || subcommand === '-h') {
			return showHelp();
		}

		switch (subcommand) {
			case 'set':
				return setApiKey(args[1]);
			case 'show':
				return showApiKey();
			case 'clear':
				return clearApiKey();
			case 'status':
				return showStatus();
			default:
				// Si pasan directamente la key
				if (subcommand.startsWith('AIza') || subcommand.length > 30) {
					return setApiKey(subcommand);
				}
				return {
					output: `<span class="error-text">Subcomando '${subcommand}' no reconocido</span>\nUsa <span class="command-highlight">apikey help</span> para ver opciones`,
					isHtml: true
				};
		}
	}
};

function showHelp() {
	return {
		output: `<span class="system-header">🔐 CONFIGURACIÓN DE API KEY</span>

<span class="category-header">¿Es seguro?</span>
<span class="ai-success">✓ Tu key se guarda SOLO en localStorage de TU navegador</span>
<span class="ai-success">✓ El servidor NUNCA almacena tu key</span>
<span class="ai-success">✓ Se envía directo a Gemini API (no pasa por nuestro backend)</span>
<span class="ai-success">✓ Podés verificar el código: es open source</span>

<span class="category-header">Uso:</span>
  <span class="command-highlight">apikey set &lt;tu-api-key&gt;</span>   Configura tu key
  <span class="command-highlight">apikey show</span>               Muestra la key (parcial)
  <span class="command-highlight">apikey clear</span>              Elimina la key guardada
  <span class="command-highlight">apikey status</span>             Verifica el estado

<span class="category-header">Obtener una API key GRATIS:</span>
  1. Ve a <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>
  2. Crea una nueva API key (gratis, sin tarjeta)
  3. Copia la key y ejecuta: <span class="command-highlight">apikey set TU_KEY</span>

<span class="system-hint">💡 Al cerrar el navegador, tu key sigue guardada localmente</span>
<span class="ai-warning">⚠️ Nunca compartas tu API key con nadie</span>`,
		isHtml: true
	};
}

function setApiKey(key: string | undefined) {
	if (!key) {
		return {
			output: `<span class="error-text">Debes proporcionar una API key</span>
Ejemplo: <span class="command-highlight">apikey set AIzaSy...</span>`,
			isHtml: true
		};
	}

	// Validación básica
	if (key.length < 20) {
		return {
			output: `<span class="error-text">La API key parece muy corta</span>
Las keys de Gemini suelen empezar con "AIza" y tienen ~39 caracteres`,
			isHtml: true
		};
	}

	saveGeminiApiKey(key);

	const masked = key.slice(0, 8) + '...' + key.slice(-4);
	return {
		output: `<span class="ai-success">✓ API key configurada correctamente</span>
Key: <span class="mode-name">${masked}</span>
<span class="system-hint">Guardada en localStorage de tu navegador</span>
<span class="system-hint">El dueño del portfolio NO puede ver esta key</span>`,
		isHtml: true
	};
}

function showApiKey() {
	const key = loadGeminiApiKey();

	if (!key) {
		return {
			output: `<span class="ai-warning">⚠️ No hay API key configurada</span>
Usa <span class="command-highlight">apikey set &lt;tu-key&gt;</span> para configurar una`,
			isHtml: true
		};
	}

	const masked = key.slice(0, 8) + '...' + key.slice(-4);
	return {
		output: `<span class="system-header">🔑 API Key actual:</span> <span class="mode-name">${masked}</span>
<span class="system-hint">Almacenada en: localStorage (solo tu navegador)</span>`,
		isHtml: true
	};
}

function clearApiKey() {
	saveGeminiApiKey('');
	return {
		output: `<span class="ai-success">✓ API key eliminada de localStorage</span>
<span class="system-hint">Se usará la key del servidor (si está disponible)</span>`,
		isHtml: true
	};
}

function showStatus() {
	const key = loadGeminiApiKey();
	const hasKey = !!key;

	return {
		output: `<span class="system-header">📊 Estado de API Key</span>

<span class="category-header">Tu key (localStorage):</span> ${hasKey ? '<span class="ai-success">✓ Configurada</span>' : '<span class="ai-warning">✗ No configurada</span>'}
<span class="category-header">Almacenamiento:</span> Solo en tu navegador
<span class="category-header">Privacidad:</span> El servidor NO accede a tu key

<span class="system-hint">${hasKey ? 'Las consultas AI usarán TU key de Gemini' : 'Las consultas usarán la key del servidor (si existe)'}</span>`,
		isHtml: true
	};
}

export default apikey;
