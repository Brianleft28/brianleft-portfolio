import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env desde el root del proyecto
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { AppModule } from '../app.module';
import { seedMemories } from './memory.seeder';
import { bootstrapOwner } from './bootstrap-owner.seeder';
import { seedProjects } from './projects.seeder';

/**
 * Seeder de arranque del portfolio.
 *
 * Levanta un contexto Nest standalone para poder reutilizar por DI los servicios
 * que ya implementan la inicialización de usuario y el sync del filesystem,
 * en vez de duplicar esa lógica con un DataSource crudo.
 *
 * Orden:
 *   1. Memorias globales (meta.md y demás docs del sistema, userId = null)
 *   2. Usuario dueño + su filesystem, settings, personalidades de IA y memorias base
 *   3. Proyectos versionados en `${MEMORY_PATH}/projects/*.md`
 *
 * Todo el proceso es idempotente: se puede reejecutar sin duplicar nada.
 */
async function runSeeders() {
  console.log('🌱 Iniciando seeders...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);
    console.log('✅ Conexión a base de datos establecida\n');

    console.log('═══════════════════════════════════════');
    console.log('📚 MEMORIAS GLOBALES DEL SISTEMA');
    console.log('═══════════════════════════════════════');
    await seedMemories(dataSource);

    console.log('\n═══════════════════════════════════════');
    console.log('👤 USUARIO DUEÑO DEL PORTFOLIO');
    console.log('═══════════════════════════════════════');
    const owner = await bootstrapOwner(app);

    console.log('\n═══════════════════════════════════════');
    console.log('🗂️  PROYECTOS');
    console.log('═══════════════════════════════════════');
    await seedProjects(app, owner.id);

    console.log('\n✅ Seeder completado exitosamente');
    console.log('   Siguiente paso: completar el perfil en /admin/settings');
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    await app.close();
    process.exit(1);
  }

  await app.close();

  // `AppModule` crea su cliente de Redis a mano (fuera del ciclo de vida de Nest),
  // así que ese handle mantiene el event loop vivo y el proceso nunca cerraría solo.
  process.exit(0);
}

runSeeders();
