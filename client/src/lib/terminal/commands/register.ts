import type { Command } from '../types';

/**
 * Comando para registrar nuevos usuarios (crear portfolio)
 * Estilo backend dev: desde la terminal
 */
export const register: Command = {
	name: 'register',
	description: 'Registrar nuevo usuario (crear portfolio)',
	usage: 'register <username> <email> [--name "Nombre Apellido"] [--role "Developer"]',

	execute(args) {
		if (!args.length || args[0] === 'help' || args[0] === '-h') {
			return showHelp();
		}

		// Parsear argumentos
		const parsed = parseArgs(args);

		if (!parsed.username) {
			return {
				output: `<span class="error-text">❌ Username requerido</span>
Uso: <span class="command-highlight">register &lt;username&gt; &lt;email&gt;</span>`,
				isHtml: true
			};
		}

		if (!parsed.email) {
			return {
				output: `<span class="error-text">❌ Email requerido</span>
Uso: <span class="command-highlight">register ${parsed.username} &lt;email&gt;</span>`,
				isHtml: true
			};
		}

		// Validar email básico
		if (!parsed.email.includes('@')) {
			return {
				output: `<span class="error-text">❌ Email inválido: ${parsed.email}</span>`,
				isHtml: true
			};
		}

		// Crear usuario via API (async)
		createUser(parsed);

		return {
			output: `<span class="ai-info">⏳ Creando usuario <strong>${parsed.username}</strong>...</span>

<span class="system-hint">Esto creará:
  • Carpeta ~/projects
  • Configuración inicial
  • Subdomain: ${parsed.username}.portfolio.dev</span>`,
			isHtml: true
		};
	}
};

function showHelp() {
	return {
		output: `<span class="system-header">👤 REGISTRO DE USUARIO</span>

<span class="category-header">Uso:</span>
  <span class="command-highlight">register &lt;username&gt; &lt;email&gt; [opciones]</span>

<span class="category-header">Opciones:</span>
  <span class="command-highlight">--name "Nombre Apellido"</span>   Nombre completo
  <span class="command-highlight">--role "Developer"</span>        Rol profesional
  <span class="command-highlight">--password "..."</span>          Contraseña (auto-generada si no se proporciona)

<span class="category-header">Ejemplos:</span>
  <span class="command-highlight">register johndoe john@example.com</span>
  <span class="command-highlight">register janedoe jane@dev.io --name "Jane Doe" --role "Full Stack Developer"</span>

<span class="category-header">Qué se crea:</span>
  • Usuario en la base de datos
  • Carpeta ~/projects para el portfolio
  • Configuración inicial del sitio
  • Subdomain: &lt;username&gt;.portfolio.dev

<span class="ai-warning">⚠️ Guarda la contraseña generada en un lugar seguro!</span>`,
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
		email: ''
	};

	let i = 0;

	// Primer argumento: username
	if (args[i] && !args[i].startsWith('--')) {
		result.username = args[i];
		i++;
	}

	// Segundo argumento: email
	if (args[i] && !args[i].startsWith('--')) {
		result.email = args[i];
		i++;
	}

	// Parsear opciones
	while (i < args.length) {
		const arg = args[i];
		
		if (arg === '--name' && args[i + 1]) {
			const name = args[i + 1];
			const parts = name.split(' ');
			result.firstName = parts[0];
			result.lastName = parts.slice(1).join(' ') || undefined;
			i += 2;
		} else if (arg === '--role' && args[i + 1]) {
			result.role = args[i + 1];
			i += 2;
		} else if (arg === '--password' && args[i + 1]) {
			result.password = args[i + 1];
			i += 2;
		} else {
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

		// Mostrar resultado exitoso
		showResult(`<span class="ai-success">✅ Usuario creado exitosamente!</span>

<span class="category-header">Credenciales:</span>
  <span class="ai-info">Username:</span> <strong>${data.user.username}</strong>
  <span class="ai-info">Email:</span> ${data.user.email}
  <span class="ai-info">Password:</span> <code class="password-reveal">${data.password}</code>

<span class="category-header">Acceso:</span>
  <span class="ai-info">Subdomain:</span> <a href="https://${data.subdomain}" target="_blank">${data.subdomain}</a>
  <span class="ai-info">Admin:</span> <a href="/admin/login" target="_blank">/admin/login</a>

<span class="ai-warning">⚠️ IMPORTANTE: Guarda la contraseña en un lugar seguro!</span>
<span class="ai-warning">   No se puede recuperar después.</span>

<span class="system-hint">💡 Tip: Usa <code>admin login</code> para acceder al panel</span>`);

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
