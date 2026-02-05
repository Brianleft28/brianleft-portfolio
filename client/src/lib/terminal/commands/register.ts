import type { Command } from '../types';
import { t } from '$lib/i18n/helpers';

/**
 * Comando para registrar nuevos usuarios (crear portfolio)
 * Estilo backend dev: desde la terminal
 */
export const register: Command = {
	name: 'register',
	description: t('terminal.register.description'),
	usage: 'register -u <username> -e <email> -p <password>',

	execute(args) {
		if (!args.length || args[0] === 'help' || args[0] === '-h') {
			return showHelp();
		}

		// Parsear argumentos
		const parsed = parseArgs(args);

		if (!parsed.username) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.register.errors.username_required')}</span>
${t('common.usage')}: <span class="command-highlight">register -u &lt;username&gt; -e &lt;email&gt; -p &lt;password&gt;</span>`,
				isHtml: true
			};
		}

		if (!parsed.email) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.register.errors.email_required')}</span>
${t('common.usage')}: <span class="command-highlight">register -u ${parsed.username} -e &lt;email&gt; -p &lt;password&gt;</span>`,
				isHtml: true
			};
		}

		if (!parsed.password) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.register.errors.password_required')}</span>
${t('common.usage')}: <span class="command-highlight">register -u ${parsed.username} -e ${parsed.email || '&lt;email&gt;'} -p &lt;password&gt;</span>`,
				isHtml: true
			};
		}

		// Validar email básico
		if (!parsed.email.includes('@')) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.register.errors.invalid_email')}: ${parsed.email}</span>`,
				isHtml: true
			};
		}

		// Crear usuario via API (async)
		createUser(parsed);

		return {
			output: `<span class="ai-info">⏳ ${t('terminal.register.creating')} <strong>${parsed.username}</strong>...</span>

<span class="system-hint">${t('terminal.register.will_create')}
  • ${t('terminal.register.projects_folder')}
  • ${t('terminal.register.initial_config')}
  • ${t('terminal.register.subdomain')}: ${parsed.username}.portfolio.dev</span>`,
			isHtml: true
		};
	}
};



function showHelp() {
	return {
		output: `<span class="system-header">👤 ${t('terminal.register.title')}</span>

<span class="category-header">${t('common.usage')}:</span>
  <span class="command-highlight">register -u &lt;username&gt; -e &lt;email&gt; -p &lt;password&gt; [${t('common.options').toLowerCase()}]</span>

<span class="category-header">${t('common.options')}:</span>
  <span class="command-highlight">-u</span>   ${t('terminal.register.options.username')}
  <span class="command-highlight">-e</span>   ${t('terminal.register.options.email')}
  <span class="command-highlight">-p</span>   ${t('terminal.register.options.password')}
  <span class="command-highlight">-n</span>   ${t('terminal.register.options.name')} (ej: -n "Juan Perez")
  <span class="command-highlight">-r</span>   ${t('terminal.register.options.role')} (ej: -r "Developer")
  <span class="command-highlight">-h</span>   ${t('terminal.register.options.help')}

<span class="category-header">${t('common.examples')}:</span>
  <span class="command-highlight">register -u johndoe -e john@example.com -p 123456</span>
  <span class="command-highlight">register -u janedoe -e jane@dev.io -p 123456 -n "Jane Doe" -r "Full Stack"</span>

<span class="category-header">${t('terminal.register.will_create')}:</span>
  • ${t('terminal.register.creates.user_db')}
  • ${t('terminal.register.creates.projects_folder')}
  • ${t('terminal.register.creates.initial_config')}
  • Subdomain: &lt;username&gt;.portfolio.dev

<span class="ai-warning">⚠️ ${t('terminal.register.warning')}</span>`,
		isHtml: true
	};
}

interface RegisterParams {
	username: string;
	email: string;
	firstName?: string;
	lastName?: string;
	role?: string;
	password?: string;
} 


function parseArgs(args: string[]): RegisterParams {
	const result: RegisterParams = {
		username: '',
		email: '',
		password: ''
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '-u' && args[i + 1]) {
			result.username = args[i + 1];
			i++;
		} else if (arg === '-e' && args[i + 1]) {
			result.email = args[i + 1];
			i++;
		} else if (arg === '-p' && args[i + 1]) {
			result.password = args[i + 1];
			i++;
		} else if (arg === '-n' && args[i + 1]) {
			const name = args[i + 1];
			const parts = name.split(' ');
			result.firstName = parts[0];
			result.lastName = parts.slice(1).join(' ') || undefined;
			i++;
		} else if (arg === '-r' && args[i + 1]) {
			result.role = args[i + 1];
			i++;
		}
	}

	return result;
}



async function createUser(params: RegisterParams) {
	try {
		const response = await fetch('/api/auth/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(params)
		});

		const data = await response.json();

		if (!response.ok) {
			// Mostrar error en la terminal (método hacky pero funciona)
			showResult(`<span class="error-text">❌ Error al crear usuario</span>
<span class="ai-warning">${data.message || 'Error desconocido'}</span>`);
			return;
		}

		// Guardar email para verificación
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('pending_verification_email', params.email);
		}

		// Mostrar resultado exitoso con instrucciones de verificación
		const verificationMessage = data.requiresVerification 
			? `
<span class="ai-warning">📧 VERIFICACIÓN REQUERIDA</span>
<span class="system-hint">Se envió un código de 6 dígitos a <strong>${params.email}</strong></span>
`
			: '';

		showResult(`<span class="ai-success">✅ Usuario creado exitosamente!</span>

<span class="category-header">Credenciales:</span>
  <span class="ai-info">Username:</span> <strong>${data.user.username}</strong>
  <span class="ai-info">Email:</span> ${data.user.email}
  <span class="ai-info">Password:</span> <code class="password-reveal">${data.password}</code>
${verificationMessage}
<span class="category-header">Acceso:</span>
  <span class="ai-info">Subdomain:</span> <a href="https://${data.subdomain}" target="_blank">${data.subdomain}</a>
  <span class="ai-info">Admin:</span> <a href="/admin/login" target="_blank">/admin/login</a>

<span class="ai-warning">⚠️ IMPORTANTE: Guarda la contraseña en un lugar seguro!</span>
<span class="ai-warning">   No se puede recuperar después.</span>

<span class="system-hint">💡 Tip: Usa <code>admin login</code> para acceder al panel</span>`);

		// Activar modo verificación inline si se requiere
		if (data.requiresVerification) {
			window.dispatchEvent(
				new CustomEvent('terminal:verification-mode', {
					detail: { email: params.email }
				})
			);
		}

	} catch (error) {
		showResult(`<span class="error-text">❌ Error de conexión</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error desconocido'}</span>`);
	}
}

/**
 * Función para mostrar resultado asíncrono en la terminal
 * Usa un evento custom que el terminal puede escuchar
 */
function showResult(html: string) {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('terminal:output', {
				detail: { output: html, isHtml: true }
			})
		);
	}
}

export default register;
