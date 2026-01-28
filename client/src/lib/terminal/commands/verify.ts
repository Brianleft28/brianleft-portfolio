import type { Command } from '../types';

/**
 * Comando para verificar email después de registro
 */
export const verify: Command = {
	name: 'verify',
	description: 'Verificar email con código de confirmación',
	usage: 'verify <código> | verify resend [email]',

	execute(args) {
		if (!args.length || args[0] === 'help' || args[0] === '-h') {
			return showHelp();
		}

		// Subcomando resend
		if (args[0] === 'resend') {
			const email = args[1] || getPendingEmail();
			if (!email) {
				return {
					output: `<span class="error-text">❌ Email requerido</span>
Uso: <span class="command-highlight">verify resend &lt;email&gt;</span>`,
					isHtml: true
				};
			}
			resendCode(email);
			return {
				output: `<span class="ai-info">⏳ Reenviando código a <strong>${email}</strong>...</span>`,
				isHtml: true
			};
		}

		// Verificar código
		const code = args[0];
		
		// Validar formato de código (6 dígitos)
		if (!/^\d{6}$/.test(code)) {
			return {
				output: `<span class="error-text">❌ Código inválido</span>
<span class="system-hint">El código debe ser de 6 dígitos numéricos</span>
<span class="system-hint">Ejemplo: <code>verify 123456</code></span>`,
				isHtml: true
			};
		}

		// Obtener email pendiente
		const email = args[1] || getPendingEmail();
		if (!email) {
			return {
				output: `<span class="error-text">❌ No hay verificación pendiente</span>
<span class="system-hint">Incluye el email: <code>verify ${code} tu@email.com</code></span>`,
				isHtml: true
			};
		}

		verifyCode(email, code);
		
		return {
			output: `<span class="ai-info">⏳ Verificando código...</span>`,
			isHtml: true
		};
	}
};

function showHelp() {
	return {
		output: `<span class="system-header">🔐 VERIFICACIÓN DE EMAIL</span>

<span class="category-header">Uso:</span>
  <span class="command-highlight">verify &lt;código&gt;</span>           Verificar con código de 6 dígitos
  <span class="command-highlight">verify &lt;código&gt; &lt;email&gt;</span>    Verificar especificando email
  <span class="command-highlight">verify resend</span>              Reenviar código
  <span class="command-highlight">verify resend &lt;email&gt;</span>      Reenviar a email específico

<span class="category-header">Ejemplos:</span>
  <span class="command-highlight">verify 123456</span>
  <span class="command-highlight">verify 123456 user@example.com</span>
  <span class="command-highlight">verify resend</span>
  <span class="command-highlight">verify resend user@example.com</span>

<span class="system-hint">💡 El código se envía al registrarse y expira en 15 minutos</span>`,
		isHtml: true
	};
}

function getPendingEmail(): string | null {
	if (typeof window !== 'undefined') {
		return sessionStorage.getItem('pending_verification_email');
	}
	return null;
}

async function verifyCode(email: string, code: string) {
	try {
		const response = await fetch('/api/auth/verify-email', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email, code })
		});

		const data = await response.json();

		if (!response.ok) {
			showResult(`<span class="error-text">❌ Verificación fallida</span>
<span class="ai-warning">${data.message || 'Código inválido o expirado'}</span>

<span class="system-hint">Prueba con: <code>verify resend</code> para obtener un nuevo código</span>`);
			return;
		}

		// Limpiar email pendiente
		if (typeof window !== 'undefined') {
			sessionStorage.removeItem('pending_verification_email');
		}

		showResult(`<span class="ai-success">✅ Email verificado exitosamente!</span>

<span class="category-header">Tu cuenta está activa</span>

<span class="system-hint">🚀 Ya puedes acceder a tu panel:</span>
  <span class="command-highlight">admin login</span>
  o visita <a href="/admin/login" target="_blank">/admin/login</a>`);

	} catch (error) {
		showResult(`<span class="error-text">❌ Error de conexión</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error desconocido'}</span>`);
	}
}

async function resendCode(email: string) {
	try {
		const response = await fetch('/api/auth/resend-verification', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email })
		});

		const data = await response.json();

		if (!response.ok) {
			showResult(`<span class="error-text">❌ Error al reenviar</span>
<span class="ai-warning">${data.message || 'Error desconocido'}</span>`);
			return;
		}

		if (data.message === 'Email ya verificado') {
			showResult(`<span class="ai-success">✅ El email ya está verificado</span>

<span class="system-hint">Ya puedes hacer login:</span>
  <span class="command-highlight">admin login</span>`);
			return;
		}

		showResult(`<span class="ai-success">📧 Código reenviado!</span>

<span class="system-hint">Revisa tu correo <strong>${email}</strong></span>
<span class="system-hint">El código expira en 15 minutos</span>

<span class="category-header">Siguiente paso:</span>
  <span class="command-highlight">verify &lt;código&gt;</span>`);

	} catch (error) {
		showResult(`<span class="error-text">❌ Error de conexión</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error desconocido'}</span>`);
	}
}

/**
 * Función para mostrar resultado asíncrono en la terminal
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

export default verify;
