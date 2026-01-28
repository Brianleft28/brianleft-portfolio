import type { Command, CommandContext, CommandResult } from '../types';

const emailCommand: Command = {
	name: 'email',
	description: 'Ver o cambiar tu email (requiere login)',
	usage: 'email [nuevo_email]',
	requiresAuth: true,

	async execute(args: string[], context: CommandContext): Promise<CommandResult> {
		const newEmail = args[0]?.trim();

		// Si no hay argumento, mostrar email actual
		if (!newEmail) {
			try {
				const response = await fetch('/api/users/me', {
					credentials: 'include'
				});

				if (response.status === 401) {
					return {
						output: `❌ Debes iniciar sesión primero.

Usa: <code>admin login</code>`,
						isHtml: true
					};
				}

				if (!response.ok) {
					return {
						output: '❌ Error al obtener información del usuario',
						isHtml: false
					};
				}

				const user = await response.json();
				const verified = user.emailVerified ? '✅ verificado' : '⚠️ no verificado';

				return {
					output: `📧 Tu email actual: <strong>${user.email || '(no configurado)'}</strong>
Estado: ${verified}

Para cambiar tu email, usa:
<code>email nuevo@email.com</code>`,
					isHtml: true
				};
			} catch (error) {
				return {
					output: '❌ Error de conexión',
					isHtml: false
				};
			}
		}

		// Validar formato de email básico
		if (!newEmail.includes('@') || !newEmail.includes('.')) {
			return {
				output: `❌ Email inválido: <code>${newEmail}</code>

Formato correcto: <code>usuario@dominio.com</code>`,
				isHtml: true
			};
		}

		// Actualizar email
		try {
			const response = await fetch('/api/users/me', {
				method: 'PATCH',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: newEmail })
			});

			const data = await response.json();

			if (response.status === 401) {
				return {
					output: `❌ Debes iniciar sesión primero.

Usa: <code>admin login</code>`,
					isHtml: true
				};
			}

			if (!response.ok) {
				return {
					output: `❌ ${data.message || 'Error al actualizar email'}`,
					isHtml: false
				};
			}

			return {
				output: `✅ Email actualizado a: <strong>${newEmail}</strong>

⚠️ Tu email requiere verificación.
Revisa tu bandeja de entrada y usa: <code>verify</code>`,
				isHtml: true
			};
		} catch (error) {
			return {
				output: '❌ Error de conexión al actualizar email',
				isHtml: false
			};
		}
	},
};

export default emailCommand;
