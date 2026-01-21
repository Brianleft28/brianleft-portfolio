import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

// Cache del token JWT
let cachedToken: { token: string; expires: number } | null = null;

async function getApiToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

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
  cachedToken = {
    token: data.accessToken,
    expires: Date.now() + 50 * 60 * 1000
  };

  return data.accessToken;
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user?.authenticated) {
    return { cvInfo: null, images: [], error: 'No autenticado' };
  }

  try {
    // Cargar info de CV e imágenes en paralelo
    const [cvResponse, imagesResponse] = await Promise.all([
      fetch(`${API_URL}/uploads/cv/info`),
      fetch(`${API_URL}/uploads/images`)
    ]);

    const cvInfo = await cvResponse.json();
    const imagesData = await imagesResponse.json();

    return { 
      cvInfo, 
      images: imagesData.images || [],
      error: null 
    };
  } catch (e) {
    return { 
      cvInfo: null, 
      images: [],
      error: e instanceof Error ? e.message : 'Error desconocido' 
    };
  }
};

export const actions: Actions = {
  uploadCv: async ({ request, locals }) => {
    if (!locals.user?.authenticated) {
      return fail(401, { error: 'No autenticado' });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return fail(400, { error: 'No se proporcionó archivo' });
    }

    if (file.type !== 'application/pdf') {
      return fail(400, { error: 'Solo se permiten archivos PDF' });
    }

    if (file.size > 5 * 1024 * 1024) {
      return fail(400, { error: 'El archivo no puede superar 5MB' });
    }

    try {
      const token = await getApiToken();
      
      const apiFormData = new FormData();
      apiFormData.append('file', file);

      const response = await fetch(`${API_URL}/uploads/cv`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: apiFormData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al subir CV');
      }

      return { success: true, message: 'CV subido correctamente' };
    } catch (e) {
      return fail(500, { error: e instanceof Error ? e.message : 'Error al subir CV' });
    }
  },

  uploadImage: async ({ request, locals }) => {
    if (!locals.user?.authenticated) {
      return fail(401, { error: 'No autenticado' });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || file.size === 0) {
      return fail(400, { error: 'No se proporcionó archivo' });
    }

    if (!type) {
      return fail(400, { error: 'Tipo de imagen requerido' });
    }

    const validTypes = ['avatar', 'project', 'logo', 'background'];
    if (!validTypes.includes(type)) {
      return fail(400, { error: 'Tipo de imagen inválido' });
    }

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      return fail(400, { error: 'Solo se permiten imágenes (JPG, PNG, GIF, WebP)' });
    }

    if (file.size > 2 * 1024 * 1024) {
      return fail(400, { error: 'La imagen no puede superar 2MB' });
    }

    try {
      const token = await getApiToken();
      
      const apiFormData = new FormData();
      apiFormData.append('file', file);

      const response = await fetch(`${API_URL}/uploads/images/${type}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: apiFormData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al subir imagen');
      }

      return { success: true, message: `Imagen ${type} subida correctamente` };
    } catch (e) {
      return fail(500, { error: e instanceof Error ? e.message : 'Error al subir imagen' });
    }
  },

  deleteImage: async ({ request, locals }) => {
    if (!locals.user?.authenticated) {
      return fail(401, { error: 'No autenticado' });
    }

    const formData = await request.formData();
    const type = formData.get('type') as string;

    if (!type) {
      return fail(400, { error: 'Tipo de imagen requerido' });
    }

    try {
      const token = await getApiToken();
      
      const response = await fetch(`${API_URL}/uploads/images/${type}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar imagen');
      }

      return { success: true, message: 'Imagen eliminada' };
    } catch (e) {
      return fail(500, { error: e instanceof Error ? e.message : 'Error al eliminar' });
    }
  }
};
