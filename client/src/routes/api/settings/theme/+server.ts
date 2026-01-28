import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.API_URL || 'http://api:4000';

// GET: Obtener tema actual del portfolio (público)
export const GET: RequestHandler = async () => {
    try {
        const response = await fetch(`${API_URL}/settings/key/theme`);
        
        if (response.ok) {
            const data = await response.json();
            return json({ value: data.value || 'matrix' });
        }
        
        // Si no existe el setting, devolver default
        return json({ value: 'matrix' });
    } catch (error) {
        console.error('Error fetching theme setting:', error);
        return json({ value: 'matrix' });
    }
};

// PUT: Actualizar tema (requiere autenticación)
export const PUT: RequestHandler = async ({ request, cookies }) => {
    try {
        const accessToken = cookies.get('access_token');
        
        if (!accessToken) {
            return json({ message: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const themeName = body.value;

        if (!themeName) {
            return json({ message: 'Tema no especificado' }, { status: 400 });
        }

        // Primero intentar obtener el setting existente
        const getResponse = await fetch(`${API_URL}/settings/key/theme`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (getResponse.ok) {
            // Existe, hacer PATCH
            const existingSetting = await getResponse.json();
            const updateResponse = await fetch(`${API_URL}/settings/${existingSetting.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value: themeName }),
            });

            if (updateResponse.ok) {
                return json({ success: true, value: themeName });
            }
            return json({ message: 'Error al actualizar tema' }, { status: 500 });
        } else {
            // No existe, crear nuevo setting
            const createResponse = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key: 'theme',
                    value: themeName,
                    type: 'string',
                    category: 'branding',
                    description: 'Tema visual del portfolio',
                }),
            });

            if (createResponse.ok) {
                return json({ success: true, value: themeName });
            }
            return json({ message: 'Error al crear configuración de tema' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error updating theme setting:', error);
        return json({ message: 'Error al actualizar tema' }, { status: 500 });
    }
};
