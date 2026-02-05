import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

const API_URL = PUBLIC_API_URL || 'http://api:4000';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user?.authenticated || !locals.user.token) {
    return { cvInfo: null, images: [], error: 'No autenticado' };
  }

  const token = locals.user.token;

  try {
    // Cargar info de CV e imágenes en paralelo
    const [cvResponse, imagesResponse] = await Promise.all([
      fetch(`${API_URL}/uploads/cv/info`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${API_URL}/uploads/images`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
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
    if (!locals.user?.authenticated || !locals.user.token) {
      return fail(401, { error: 'No autenticado' });
    }

    const token = locals.user.token;
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
    if (!locals.user?.authenticated || !locals.user.token) {
      return fail(401, { error: 'No autenticado' });
    }

    const token = locals.user.token;
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
    if (!locals.user?.authenticated || !locals.user.token) {
      return fail(401, { error: 'No autenticado' });
    }

    const token = locals.user.token;
    const formData = await request.formData();
    const type = formData.get('type') as string;

    if (!type) {
      return fail(400, { error: 'Tipo de imagen requerido' });
    }

    try {
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
