import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const API_URL = env.API_URL || 'http://api:4000';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        
        return json(data, { status: response.status });
    } catch (error) {
        console.error('Error proxying contact request:', error);
        return json(
            { message: 'Error al procesar la solicitud' },
            { status: 500 }
        );
    }
};
