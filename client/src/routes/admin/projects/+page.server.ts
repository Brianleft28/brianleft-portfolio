import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// Dinámico y no estático: docker-compose pasa PUBLIC_API_URL como env de runtime,
// así que `static` la hornearía vacía en la imagen.
const API_URL = env.PUBLIC_API_URL || 'http://api:4000';

export const load = (async ({ locals }) => {
	if (!locals.user?.authenticated || !locals.user.token) {
		return { projects: [], filesystem: [], folders: [], error: 'No autenticado' };
	}

	const token = locals.user.token;

	try {
		// Cargar proyectos, filesystem y carpetas en paralelo
		const [projectsRes, filesystemRes, foldersRes] = await Promise.all([
			fetch(`${API_URL}/projects`, {
				headers: { Authorization: `Bearer ${token}` }
			}),
			fetch(`${API_URL}/filesystem`, {
				headers: { Authorization: `Bearer ${token}` }
			}),
			fetch(`${API_URL}/filesystem/folders`, {
				headers: { Authorization: `Bearer ${token}` }
			})
		]);

		const projects = projectsRes.ok ? await projectsRes.json() : [];
		const filesystem = filesystemRes.ok ? await filesystemRes.json() : [];
		const folders = foldersRes.ok ? await foldersRes.json() : [];

		return { projects, filesystem, folders, error: null };
	} catch (e) {
		return {
			projects: [],
			filesystem: [],
			folders: [],
			error: e instanceof Error ? e.message : 'Error desconocido'
		};
	}
}) satisfies PageServerLoad;

export const actions = {
	createProject: async ({ request, locals }) => {
		if (!locals.user?.authenticated || !locals.user.token) {
			return fail(401, { error: 'No autenticado' });
		}

		const token = locals.user.token;
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const slug = formData.get('slug')?.toString();
		const content = formData.get('content')?.toString();
		const keywords = formData.get('keywords')?.toString();
		const folderId = formData.get('folderId')?.toString();

		if (!name || !slug || !content) {
			return fail(400, { error: 'Nombre, slug y contenido son requeridos' });
		}

		try {

			const response = await fetch(`${API_URL}/projects`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					name,
					slug,
					content,
					keywords: keywords ? keywords.split(',').map((k) => k.trim()) : [],
					folderId: folderId ? parseInt(folderId) : undefined
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Error creando proyecto');
			}

			return { success: true, action: 'create' };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
		}
	},

	deleteProject: async ({ request, locals }) => {
		if (!locals.user?.authenticated || !locals.user.token) {
			return fail(401, { error: 'No autenticado' });
		}

		const token = locals.user.token;
		const formData = await request.formData();
		const slug = formData.get('slug')?.toString();

		if (!slug) {
			return fail(400, { error: 'Slug de proyecto requerido' });
		}

		try {
			const response = await fetch(`${API_URL}/projects/${encodeURIComponent(slug)}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.message || 'Error borrando proyecto');
			}

			return { success: true, action: 'deleteProject' };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
		}
	},

	updateProject: async ({ request, locals }) => {
		if (!locals.user?.authenticated || !locals.user.token) {
			return fail(401, { error: 'No autenticado' });
		}

		const token = locals.user.token;
		const formData = await request.formData();
		const slug = formData.get('slug')?.toString();
		const name = formData.get('name')?.toString();
		const content = formData.get('content')?.toString();
		const summary = formData.get('summary')?.toString();
		const keywords = formData.get('keywords')?.toString();

		if (!slug) {
			return fail(400, { error: 'Slug de proyecto requerido' });
		}

		try {
			const response = await fetch(`${API_URL}/projects/${encodeURIComponent(slug)}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					...(name ? { name } : {}),
					...(content ? { content } : {}),
					...(summary !== undefined ? { summary } : {}),
					...(keywords ? { keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) } : {})
				})
			});

			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				throw new Error(err.message || 'Error editando proyecto');
			}

			return { success: true, action: 'updateProject' };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
		}
	},

	deleteFolder: async ({ request, locals }) => {
		if (!locals.user?.authenticated || !locals.user.token) {
			return fail(401, { error: 'No autenticado' });
		}

		const token = locals.user.token;
		const formData = await request.formData();
		const folderId = formData.get('folderId')?.toString();

		if (!folderId) {
			return fail(400, { error: 'ID de carpeta requerido' });
		}

		try {

			const response = await fetch(`${API_URL}/filesystem/folder/${folderId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Error borrando carpeta');
			}

			const result = await response.json();
			return { 
				success: true, 
				action: 'deleteFolder',
				memoriesDeleted: result.memoriesDeleted || []
			};
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
		}
	},

	deleteFile: async ({ request, locals }) => {
		if (!locals.user?.authenticated || !locals.user.token) {
			return fail(401, { error: 'No autenticado' });
		}

		const token = locals.user.token;
		const formData = await request.formData();
		const fileId = formData.get('fileId')?.toString();

		if (!fileId) {
			return fail(400, { error: 'ID de archivo requerido' });
		}

		try {

			const response = await fetch(`${API_URL}/filesystem/file/${fileId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Error borrando archivo');
			}

			const result = await response.json();
			return { 
				success: true, 
				action: 'deleteFile',
				memoryDeleted: result.memoryDeleted || null
			};
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
		}
	},

	createFolder: async ({ request, locals }) => {
		if (!locals.user?.authenticated || !locals.user.token) {
			return fail(401, { error: 'No autenticado' });
		}

		const token = locals.user.token;
		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const parentId = formData.get('parentId')?.toString();

		if (!name) {
			return fail(400, { error: 'Nombre de carpeta requerido' });
		}

		try {

			const response = await fetch(`${API_URL}/filesystem/folder`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					name,
					parentId: parentId ? parseInt(parentId) : null
				})
			});

			if (!response.ok) {
				const err = await response.json();
				throw new Error(err.message || 'Error creando carpeta');
			}

			return { success: true, action: 'createFolder' };
		} catch (e) {
			return fail(500, { error: e instanceof Error ? e.message : 'Error desconocido' });
		}
	}
} satisfies Actions;
