import { env } from '$env/dynamic/private';
import { createHmac, randomBytes } from 'crypto';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 horas en segundos

/**
 * Crea un token de sesión firmado con HMAC
 */
export function createSessionToken(): string {
	const secret = env.SESSION_SECRET;
	if (!secret) {
		throw new Error('SESSION_SECRET no está configurado');
	}

	const sessionId = randomBytes(32).toString('hex');
	const timestamp = Date.now().toString();
	const data = `${sessionId}.${timestamp}`;

	const signature = createHmac('sha256', secret).update(data).digest('hex');

	return `${data}.${signature}`;
}

/**
 * Valida un token de sesión
 */
export function validateSessionToken(token: string): boolean {
	const secret = env.SESSION_SECRET;
	if (!secret || !token) {
		return false;
	}

	const parts = token.split('.');
	if (parts.length !== 3) {
		return false;
	}

	const [sessionId, timestamp, providedSignature] = parts;
	const data = `${sessionId}.${timestamp}`;

	const expectedSignature = createHmac('sha256', secret).update(data).digest('hex');

	// Verificar firma
	if (providedSignature !== expectedSignature) {
		return false;
	}

	// Verificar expiración (24 horas)
	const tokenAge = Date.now() - parseInt(timestamp, 10);
	if (tokenAge > SESSION_MAX_AGE * 1000) {
		return false;
	}

	return true;
}

/**
 * Valida las credenciales de admin
 */
export function validateCredentials(username: string, password: string): boolean {
	const adminUsername = env.ADMIN_USERNAME;
	const adminPassword = env.ADMIN_PASSWORD;

	if (!adminUsername || !adminPassword) {
		console.error('ADMIN_USERNAME o ADMIN_PASSWORD no configurados');
		return false;
	}

	return username === adminUsername && password === adminPassword;
}

/**
 * Configuración de la cookie de sesión
 */
export const sessionCookieOptions = {
	name: SESSION_COOKIE_NAME,
	maxAge: SESSION_MAX_AGE,
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'strict' as const
};

export { SESSION_COOKIE_NAME };
