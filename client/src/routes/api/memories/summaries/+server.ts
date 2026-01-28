import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API_URL = env.API_URL || 'http://localhost:3001';

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${API_URL}/memories/summaries`);
		
		if (!response.ok) {
			const error = await response.text();
			console.error('[API Summaries] Error:', error);
			return json([], { status: response.status });
		}

		const summaries = await response.json();
		return json(summaries);
	} catch (error) {
		console.error('[API Summaries] Error fetching summaries:', error);
		return json([]);
	}
};
