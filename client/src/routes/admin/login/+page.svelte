<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	export let form: ActionData;
</script>

<svelte:head>
	<title>Login - Admin | Portfolio</title>
</svelte:head>

<div class="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
	<div class="card bg-secondary text-light" style="width: 100%; max-width: 400px;">
		<div class="card-body p-4">
			<h1 class="card-title h4 text-center mb-4">🔐 Admin Login</h1>

			{#if form?.error}
				<div class="alert alert-danger" role="alert">
					{form.error}
				</div>
			{/if}

			<form method="POST" use:enhance>
				<div class="mb-3">
					<label for="username" class="form-label">Usuario</label>
					<input
						type="text"
						id="username"
						name="username"
						class="form-control"
						required
						autocomplete="username"
					/>
				</div>

				<div class="mb-3">
					<label for="password" class="form-label">Contraseña</label>
					<input
						type="password"
						id="password"
						name="password"
						class="form-control"
						required
						autocomplete="current-password"
					/>
				</div>

				<button type="submit" class="btn btn-primary w-100">Ingresar</button>
			</form>

			<div class="text-center mt-4">
				<a href="/" class="text-muted text-decoration-none">← Volver al Portfolio</a>
			</div>
		</div>
	</div>
</div>
