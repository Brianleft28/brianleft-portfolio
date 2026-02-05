import type { Command } from '../types';
import { t } from '$lib/i18n/helpers';

/**
 * Comando login - iniciar sesión desde terminal
 */
export const login: Command = {
	name: 'login',
	description: t('terminal.login.description'),
	usage: 'login -u <user> -p <pass>',

	execute(args) {
		// Sin argumentos, abrir panel de login
		if (!args.length) {
			if (typeof window !== 'undefined') {
				window.open('/admin/login', '_blank');
			}
			return {
				output: `<span class="ai-info">🔐 ${t('terminal.login.opening_panel')}</span>

<span class="system-hint">${t('terminal.login.also_use')}</span>
  <span class="command-highlight">login -u &lt;user&gt; -p &lt;pass&gt;</span>`,
				isHtml: true
			};
		}

		if (args[0] === 'help' || args[0] === '-h') {
			return showHelp();
		}

		// Parsear argumentos
		const parsed = parseArgs(args);

		if (!parsed.username) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.login.errors.username_required')}</span>
${t('common.usage')}: <span class="command-highlight">login -u &lt;user&gt; -p &lt;pass&gt;</span>`,
				isHtml: true
			};
		}

		if (!parsed.password) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.login.errors.password_required')}</span>
${t('common.usage')}: <span class="command-highlight">login -u ${parsed.username} -p &lt;pass&gt;</span>`,
				isHtml: true
			};
		}

		// Hacer login
		doLogin(parsed.username, parsed.password);

		return {
			output: `<span class="ai-info">⏳ ${t('common.loading')} <strong>${parsed.username}</strong>...</span>`,
			isHtml: true
		};
	}
};

function showHelp() {
	return {
		output: `<span class="system-header">🔐 ${t('terminal.login.title')}</span>

<span class="category-header">${t('common.usage')}:</span>
  <span class="command-highlight">login</span>              ${t('terminal.login.examples.panel')}
  <span class="command-highlight">login -u &lt;user&gt; -p &lt;pass&gt;</span>  ${t('terminal.login.examples.terminal')}

<span class="category-header">${t('common.options')}:</span>
  <span class="command-highlight">-u</span>   ${t('terminal.login.options.username')}
  <span class="command-highlight">-p</span>   ${t('terminal.login.options.password')}
  <span class="command-highlight">-h</span>   ${t('terminal.login.options.help')}

<span class="category-header">${t('common.examples')}:</span>
  <span class="command-highlight">login</span>
  <span class="command-highlight">login -u johndoe -p mypassword</span>

<span class="system-hint">💡 ${t('terminal.login.no_account')} <code>register -h</code></span>`,
		isHtml: true
	};
}

interface LoginParams {
	username: string;
	password: string;
}

function parseArgs(args: string[]): LoginParams {
	const result: LoginParams = {
		username: '',
		password: ''
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '-u' && args[i + 1]) {
			result.username = args[i + 1];
			i++;
		} else if (arg === '-p' && args[i + 1]) {
			result.password = args[i + 1];
			i++;
		}
	}

	return result;
}

async function doLogin(username: string, password: string) {
	try {
		// Usar el endpoint de SvelteKit que setea las cookies de sesión
		const response = await fetch('/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			body: JSON.stringify({ username, password })
		});

		const data = await response.json();

		if (!response.ok) {
			showResult(`<span class="error-text">❌ ${t('terminal.login.errors.auth_error')}</span>
<span class="ai-warning">${data.message || t('terminal.login.errors.invalid_credentials')}</span>

<span class="system-hint">💡 ${t('terminal.login.forgot_password')}</span>`);
			return;
		}

		// Notificar cambio de auth
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('auth:change'));
		}

		showResult(`<span class="ai-success">✅ ${t('terminal.login.success')}</span>

<span class="category-header">${t('terminal.login.welcome')} <strong>${data.user?.username || username}</strong></span>

<span class="system-hint">💡 ${t('terminal.login.admin_panel')} <code>admin</code></span>
<span class="system-hint">💡 ${t('terminal.login.your_info')} <code>whoami</code></span>
<span class="system-hint">💡 ${t('terminal.login.logout')} <code>logout</code></span>`);

	} catch (error) {
		showResult(`<span class="error-text">❌ ${t('terminal.verify.errors.connection_error')}</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error'}</span>`);
	}
}

function showResult(html: string) {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('terminal:output', {
				detail: { output: html, isHtml: true }
			})
		);
	}
}

export default login;
