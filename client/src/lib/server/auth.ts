const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24; // 24 horas en segundos

/**
 * La cookie `admin_session` guarda el access token JWT que emite la API.
 * Quien la valida es la propia API (`GET /users/me` desde `hooks.server.ts`),
 * así que acá sólo vive la configuración de la cookie.
 */
export const sessionCookieOptions = {
	name: SESSION_COOKIE_NAME,
	maxAge: SESSION_MAX_AGE,
	path: '/',
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const
};

export { SESSION_COOKIE_NAME };
