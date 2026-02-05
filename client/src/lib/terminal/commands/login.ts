import type { Command } from '../types';

/**
 * Comando login - iniciar sesión desde terminal
 */
export const login: Command = {
	name: 'login',
	description: 'Iniciar sesión',
	usage: 'login -u <user> -p <pass>',

	execute(args) {
		// Sin argumentos, abrir panel de login
		if (!args.length) {
			if (typeof window !== 'undefined') {
				window.open('/admin/login', '_blank');
			}
			return {
				output: `<span class="ai-info">🔐 Abriendo panel de login...</span>

<span class="system-hint">También puedes usar:</span>
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
				output: `<span class="error-text">❌ Username requerido</span>
Uso: <span class="command-highlight">login -u &lt;user&gt; -p &lt;pass&gt;</span>`,
				isHtml: true
			};
		}

		if (!parsed.password) {
			return {
				output: `<span class="error-text">❌ Password requerida</span>
Uso: <span class="command-highlight">login -u ${parsed.username} -p &lt;pass&gt;</span>`,
				isHtml: true
			};
		}

		// Hacer login
		doLogin(parsed.username, parsed.password);

		return {
			output: `<span class="ai-info">⏳ Iniciando sesión como <strong>${parsed.username}</strong>...</span>`,
			isHtml: true
		};
	}
};

function showHelp() {
	return {
		output: `<span class="system-header">🔐 INICIAR SESIÓN</span>

<span class="category-header">Uso:</span>
  <span class="command-highlight">login</span>              Abre panel de login
  <span class="command-highlight">login -u &lt;user&gt; -p &lt;pass&gt;</span>  Login desde terminal

<span class="category-header">Opciones:</span>
  <span class="command-highlight">-u</span>   Nombre de usuario
  <span class="command-highlight">-p</span>   Contraseña
  <span class="command-highlight">-h</span>   Mostrar ayuda

<span class="category-header">Ejemplos:</span>
  <span class="command-highlight">login</span>
  <span class="command-highlight">login -u johndoe -p mypassword</span>

<span class="system-hint">💡 No tienes cuenta? Usa <code>register -h</code></span>`,
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
			showResult(`<span class="error-text">❌ Error de autenticación</span>
<span class="ai-warning">${data.message || 'Credenciales inválidas'}</span>

<span class="system-hint">💡 ¿Olvidaste tu contraseña? Contacta al administrador.</span>`);
			return;
		}

		// Notificar cambio de auth
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('auth:change'));
		}

		showResult(`<span class="ai-success">✅ Sesión iniciada correctamente!</span>

<span class="category-header">Bienvenido, <strong>${data.user?.username || username}</strong></span>

<span class="system-hint">💡 Panel de admin: <code>admin</code></span>
<span class="system-hint">💡 Ver tu info: <code>whoami</code></span>
<span class="system-hint">💡 Cerrar sesión: <code>logout</code></span>`);

	} catch (error) {
		showResult(`<span class="error-text">❌ Error de conexión</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error desconocido'}</span>`);
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
