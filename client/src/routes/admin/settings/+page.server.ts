import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';


// Cache simple del token JWT

let cachedToken: { token: string; expires: number } | null = null;

async function getApiToken(): Promise<string> {
  // Si hay token válido en cache, usarlo
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  // Login contra la API
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error('No se pudo autenticar con la API');
  }

  const data = await response.json();
  
  // Cachear por 50 minutos (el token dura 1 hora)
  cachedToken = {
    token: data.accessToken,
    expires: Date.now() + 50 * 60 * 1000
  };

  return data.accessToken;
}

export const load: PageServerLoad = async ({ locals, fetch }) => {
  if (!locals.user?.authenticated) {
    return { settings: [], user: null, error: 'No autenticado' };
  }

  try {
    const token = await getApiToken();
    
    // Cargar settings y datos del usuario en paralelo
    const [settingsResponse, userResponse] = await Promise.all([
      fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      
      fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    if (!settingsResponse.ok) {
      throw new Error('Error al cargar settings');
    }

    const settings = await settingsResponse.json();
    const user = userResponse.ok ? await userResponse.json() : null;
    
    return { settings, user, error: null };
  } catch (e) {
    return { settings: [], user: null, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
};

export const actions: Actions = {
  save: async ({ request, locals, fetch }) => {
    if (!locals.user?.authenticated) {
      return fail(401, { error: 'No autenticado' });
    }

    const formData = await request.formData();

    const updates = JSON.parse(formData.get('updates')?.toString() || '[]');

    if (!updates.length) {
      return fail(400, { error: 'No hay cambios' });
    }

    try {
      const token = await getApiToken();

      for (const update of updates) {
        const response = await fetch(`${API_URL}/settings/${update.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ value: update.value })
        });

        if (!response.ok) {
          throw new Error(`Error actualizando ${update.key}`);
        }
      }

      return { success: true };
    } catch (e) {
      return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
    }
  }
} satisfies Actions;
