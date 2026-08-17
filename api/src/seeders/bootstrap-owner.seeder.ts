import { INestApplicationContext } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

import { Memory, MemoryType } from '../entities/memory.entity';
import { User, UserRole } from '../entities/user.entity';
import { UsersService } from '../modules/users/users.service';
import { FilesystemService } from '../modules/filesystem/filesystem.service';
import { SettingsService } from '../modules/settings/settings.service';
import { AiPersonalitiesService } from '../modules/ai-personalities/ai-personalities.service';
import { MemoryService } from '../modules/memory/memory.service';

/**
 * Crea el usuario dueño del portfolio y su estructura base.
 *
 * Reemplaza al flujo `POST /auth/register`, que fue retirado del controller
 * cuando el proyecto pasó de multi-tenant a portfolio de un solo dueño.
 * Replica exactamente los mismos pasos de inicialización que hacía
 * `AuthService.register()`, reutilizando los servicios existentes.
 *
 * Es idempotente: si ya existe un usuario ADMIN, lo devuelve sin tocar nada.
 */
export async function bootstrapOwner(app: INestApplicationContext): Promise<User> {
  const dataSource = app.get(DataSource);
  const usersRepo = dataSource.getRepository(User);

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  const email = process.env.OWNER_EMAIL;
  const firstName = process.env.OWNER_FIRST_NAME || username;
  const lastName = process.env.OWNER_LAST_NAME || '';
  const ownerRole = process.env.OWNER_ROLE || 'Full Stack Developer';

  // Idempotencia: cualquier admin preexistente es el dueño
  const existing = await usersRepo.findOne({
    where: { role: UserRole.ADMIN },
    order: { id: 'ASC' },
  });

  if (existing) {
    // El .env es la única fuente de verdad de las credenciales del dueño:
    // si cambian ahí, `npm run seed` reconcilia al usuario existente. Sin esto,
    // renombrar ADMIN_USERNAME te dejaba afuera sin ninguna señal.
    await reconcileCredentials(usersRepo, existing, username, password);
    await syncOwnerIndex(dataSource, existing.id);
    return existing;
  }

  if (!password || !email) {
    throw new Error(
      'Faltan variables de entorno para crear el usuario dueño. ' +
        'Definí ADMIN_PASSWORD y OWNER_EMAIL en el .env (ADMIN_USERNAME es opcional, default "admin").',
    );
  }

  const displayName = `${firstName} ${lastName}`.trim() || username;

  const usersService = app.get(UsersService);
  const { user } = await usersService.createUser({
    username,
    email,
    password,
    displayName,
    role: UserRole.ADMIN,
    subdomain: username.toLowerCase().replace(/[^a-z0-9]/g, ''),
  });
  console.log(`✅ Usuario dueño "${user.username}" creado (id ${user.id}).`);

  // El flujo de verificación por email ya no tiene endpoint expuesto.
  // `AuthService.login()` no exige email verificado, esto sólo evita estados intermedios.
  await usersRepo.update(user.id, { emailVerified: true });

  // Mismos inicializadores que corría AuthService.register(), en el mismo orden
  await app.get(FilesystemService).initializeForUser(user.id);
  console.log('   ├─ filesystem base creado (C:/proyectos, C:/apps).');

  await app.get(SettingsService).initializeForUser(user.id, {
    ownerName: displayName,
    ownerFirstName: firstName,
    ownerLastName: lastName,
    ownerRole,
    email,
  });
  console.log('   ├─ settings por defecto creados.');

  await app.get(AiPersonalitiesService).initializeForUser(user.id, displayName);
  console.log('   ├─ personalidades de IA creadas.');

  await app.get(MemoryService).initializeForUser(user.id, displayName);
  console.log('   └─ memorias base (index, memory) creadas.');

  await syncOwnerIndex(dataSource, user.id);

  return usersRepo.findOneOrFail({ where: { id: user.id } });
}

/**
 * Alinea las credenciales del dueño existente con las del entorno.
 * Sólo escribe si algo cambió, para que reejecutar el seeder no genere ruido.
 */
async function reconcileCredentials(
  usersRepo: Repository<User>,
  existing: User,
  username: string,
  password: string | undefined,
): Promise<void> {
  const changes: Partial<User> = {};

  if (existing.username !== username) {
    changes.username = username;
    changes.subdomain = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  if (password && !(await bcrypt.compare(password, existing.password))) {
    changes.password = await bcrypt.hash(password, 10);
  }

  if (Object.keys(changes).length === 0) {
    console.log(`⏭️  Usuario dueño "${existing.username}" ya existe (id ${existing.id}).`);
    return;
  }

  await usersRepo.update(existing.id, changes);
  const detail = [
    changes.username ? `username → "${username}"` : null,
    changes.password ? 'contraseña actualizada' : null,
  ]
    .filter(Boolean)
    .join(', ');
  console.log(`♻️  Usuario dueño reconciliado con el .env (id ${existing.id}): ${detail}.`);

  Object.assign(existing, changes);
}

/**
 * El perfil del dueño (memoria INDEX) se versiona como `${MEMORY_PATH}/index.md`.
 *
 * `MemoryService.initializeForUser()` crea un INDEX a partir de un template
 * hardcodeado; esto lo pisa con el archivo del repo, así que editar `index.md`
 * y reseedear alcanza para actualizar el perfil. Los placeholders `{{...}}` se
 * siguen resolviendo contra la parametría en cada consulta.
 *
 * La sección de proyectos NO se toca acá: la regenera `seedProjects()` después,
 * entre los marcadores `<!-- projects:auto -->`.
 */
async function syncOwnerIndex(dataSource: DataSource, userId: number): Promise<void> {
  const memoryPath = process.env.MEMORY_PATH || '/app/data/memory';
  const indexFile = path.join(memoryPath, 'index.md');

  if (!fs.existsSync(indexFile)) {
    console.warn(`⚠️  No existe ${indexFile}: se mantiene el INDEX actual.`);
    return;
  }

  const content = fs.readFileSync(indexFile, 'utf-8');
  const memoryRepo = dataSource.getRepository(Memory);
  const existing = await memoryRepo.findOne({ where: { slug: 'index', userId } });

  if (!existing) {
    await memoryRepo.save(
      memoryRepo.create({
        type: MemoryType.INDEX,
        slug: 'index',
        title: 'Perfil profesional',
        content,
        priority: 8,
        userId,
      }),
    );
    console.log('📝 Memoria INDEX del dueño creada desde index.md.');
    return;
  }

  // La comparación ignora el bloque de proyectos: lo escribe `seedProjects()`
  // después, así que siempre diferiría del archivo fuente.
  if (withoutGeneratedProjects(existing.content) === withoutGeneratedProjects(content)) {
    console.log('⏭️  Memoria INDEX del dueño ya coincide con index.md.');
    return;
  }

  await memoryRepo.update(existing.id, { content, type: MemoryType.INDEX });
  console.log('📝 Memoria INDEX del dueño actualizada desde index.md.');
}

/** Vacía el bloque generado por `seedProjects()` para poder comparar el resto. */
function withoutGeneratedProjects(content: string): string {
  return content.replace(
    /<!-- projects:auto:start -->[\s\S]*?<!-- projects:auto:end -->/,
    '<!-- projects:auto -->',
  );
}
