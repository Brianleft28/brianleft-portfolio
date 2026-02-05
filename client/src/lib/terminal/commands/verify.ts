import type { Command } from '../types';
import { t } from '$lib/i18n/helpers';

/**
 * Comando para verificar email después de registro
 */
export const verify: Command = {
	name: 'verify',
	description: t('terminal.verify.description'),
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
					output: `<span class="error-text">❌ ${t('terminal.verify.errors.email_required')}</span>
${t('common.usage')}: <span class="command-highlight">verify resend &lt;email&gt;</span>`,
					isHtml: true
				};
			}
			resendCode(email);
			return {
				output: `<span class="ai-info">⏳ ${t('terminal.verify.resending')} <strong>${email}</strong>...</span>`,
				isHtml: true
			};
		}

		// Verificar código
		const code = args[0];

		// Validar formato de código (6 dígitos)
		if (!/^\d{6}$/.test(code)) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.verify.errors.invalid_code')}</span>
<span class="system-hint">${t('terminal.verify.errors.code_format')}</span>
<span class="system-hint">${t('common.examples')}: <code>verify 123456</code></span>`,
				isHtml: true
			};
		}

		// Obtener email pendiente
		const email = args[1] || getPendingEmail();
		if (!email) {
			return {
				output: `<span class="error-text">❌ ${t('terminal.verify.errors.no_pending')}</span>
<span class="system-hint">${t('terminal.verify.include_email')} <code>verify ${code} tu@email.com</code></span>`,
				isHtml: true
			};
		}

		verifyCode(email, code);

		return {
			output: `<span class="ai-info">⏳ ${t('terminal.verify.verifying')}</span>`,
			isHtml: true
		};
	}
};

function showHelp() {
	return {
		output: `<span class="system-header">🔐 ${t('terminal.verify.title')}</span>

<span class="category-header">${t('common.usage')}:</span>
  <span class="command-highlight">verify &lt;código&gt;</span>           ${t('terminal.verify.examples.verify_code')}
  <span class="command-highlight">verify &lt;código&gt; &lt;email&gt;</span>    ${t('terminal.verify.examples.verify_email')}
  <span class="command-highlight">verify resend</span>              ${t('terminal.verify.examples.resend')}
  <span class="command-highlight">verify resend &lt;email&gt;</span>      ${t('terminal.verify.examples.resend_email')}

<span class="category-header">${t('common.examples')}:</span>
  <span class="command-highlight">verify 123456</span>
  <span class="command-highlight">verify 123456 user@example.com</span>
  <span class="command-highlight">verify resend</span>
  <span class="command-highlight">verify resend user@example.com</span>

<span class="system-hint">💡 ${t('terminal.verify.note_expiry')}</span>`,
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
			showResult(`<span class="error-text">❌ ${t('terminal.verify.errors.failed')}</span>
<span class="ai-warning">${data.message || t('terminal.verify.errors.invalid_or_expired')}</span>

<span class="system-hint">${t('terminal.verify.try_with')} <code>verify resend</code> ${t('terminal.verify.get_new_code')}</span>`);
			return;
		}

		// Limpiar email pendiente
		if (typeof window !== 'undefined') {
			sessionStorage.removeItem('pending_verification_email');
		}

		showResult(`<span class="ai-success">✅ ${t('terminal.verify.success')}</span>

<span class="category-header">${t('terminal.verify.account_active')}</span>

<span class="system-hint">🚀 ${t('terminal.verify.access_panel')}</span>
  <span class="command-highlight">admin login</span>
  ${t('terminal.verify.or_visit')} <a href="/admin/login" target="_blank">/admin/login</a>`);

	} catch (error) {
		showResult(`<span class="error-text">❌ ${t('terminal.verify.errors.connection_error')}</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error'}</span>`);
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
			showResult(`<span class="error-text">❌ ${t('common.error')}</span>
<span class="ai-warning">${data.message || t('common.error')}</span>`);
			return;
		}

		if (data.message === 'Email ya verificado') {
			showResult(`<span class="ai-success">✅ ${t('terminal.verify.already_verified')}</span>

<span class="system-hint">${t('terminal.verify.can_login')}</span>
  <span class="command-highlight">admin login</span>`);
			return;
		}

		showResult(`<span class="ai-success">📧 ${t('terminal.verify.code_resent')}</span>

<span class="system-hint">${t('terminal.verify.check_email')} <strong>${email}</strong></span>
<span class="system-hint">${t('terminal.verify.expires_15min')}</span>

<span class="category-header">${t('terminal.verify.next_step')}</span>
  <span class="command-highlight">verify &lt;código&gt;</span>`);

	} catch (error) {
		showResult(`<span class="error-text">❌ ${t('terminal.verify.errors.connection_error')}</span>
<span class="ai-warning">${error instanceof Error ? error.message : 'Error'}</span>`);
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
