import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			trustedOrigins: ['http://api:4000', 'http://client:3000'],
			checkOrigin: false // Permitir POST desde Docker containers
		}
	}
};

export default config;
