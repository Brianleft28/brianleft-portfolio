import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { PUBLIC_API_URL } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'http://api:4000';

export const load: PageServerLoad = async ({ locals, fetch }) => {
  if (!locals.user?.authenticated || !locals.user.token) {
    return { settings: [], user: null, error: 'No autenticado', portfolioDomain: 'portfolio.dev' };
  }

  const token = locals.user.token;

  try {
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
    
    // Dominio configurable desde env
    const portfolioDomain = env.PORTFOLIO_DOMAIN || 'portfolio.dev';
    
    return { settings, user, error: null, portfolioDomain };
  } catch (e) {
    return { settings: [], user: null, error: e instanceof Error ? e.message : 'Error desconocido', portfolioDomain: 'portfolio.dev' };
  }
};

export const actions: Actions = {
  save: async ({ request, locals, fetch }) => {
    if (!locals.user?.authenticated || !locals.user.token) {
      return fail(401, { error: 'No autenticado' });
    }

    const token = locals.user.token;
    const formData = await request.formData();

    const updates = JSON.parse(formData.get('updates')?.toString() || '[]');

    if (!updates.length) {
      return fail(400, { error: 'No hay cambios' });
    }

    try {
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
