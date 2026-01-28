import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.API_URL || 'http://api:4000';

export const GET: RequestHandler = async ({ request, cookies }) => {
    try {
        // Obtener token de cookie o header
        const accessToken = cookies.get('access_token');
        const authHeader = request.headers.get('Authorization');
        const token = accessToken || authHeader?.replace('Bearer ', '');
        
        if (!token) {
            return json({ message: 'No autorizado' }, { status: 401 });
        }

        const response = await fetch(`${API_URL}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        console.error('Error proxying users/me GET:', error);
        return json({ message: 'Error al obtener usuario' }, { status: 500 });
    }
};

export const PATCH: RequestHandler = async ({ request, cookies }) => {
    try {
        // Obtener token de cookie o header
        const accessToken = cookies.get('access_token');
        const authHeader = request.headers.get('Authorization');
        const token = accessToken || authHeader?.replace('Bearer ', '');
        
        if (!token) {
            return json({ message: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();

        const response = await fetch(`${API_URL}/users/me`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return json(data, { status: response.status });
    } catch (error) {
        console.error('Error proxying users/me PATCH:', error);
        return json({ message: 'Error al actualizar usuario' }, { status: 500 });
    }
};
