import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env desde el root del proyecto
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { User } from '../entities/user.entity';
import { Folder } from '../entities/folder.entity';
import { File } from '../entities/file.entity';
import { Memory } from '../entities/memory.entity';
import { MemoryKeyword } from '../entities/memory-keyword.entity';
import { Setting } from '../entities/setting.entity';
import { AiPersonality } from '../entities/ai-personality.entity';
import { seedMemories } from './memory.seeder';

/**
 * Seeder para sistema white-label
 * 
 * NOTA: En modo white-label, los settings, filesystem y ai-personalities
 * se crean dinámicamente cuando un usuario se registra via initializeForUser().
 * 
 * Este seeder solo carga la memoria base del sistema (meta.md) que contiene
 * información sobre cómo funciona el portfolio.
 */
async function runSeeders() {
  console.log('🌱 Iniciando seeders (white-label mode)...\n');

  // Crear conexión
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USER || 'portfolio',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'portfolio',
    entities: [User, Folder, File, Memory, MemoryKeyword, Setting, AiPersonality],
    synchronize: true, // Crear tablas si no existen
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida\n');

    // Solo cargar memoria base del sistema
    console.log('═══════════════════════════════════════');
    console.log('📚 SEEDING MEMORIA BASE (meta.md)');
    console.log('═══════════════════════════════════════');
    await seedMemories(dataSource);

    console.log('\n═══════════════════════════════════════');
    console.log('ℹ️  NOTA: Settings, Filesystem y AI Personalities');
    console.log('    se crean al registrar cada usuario.');
    console.log('═══════════════════════════════════════');

    console.log('\n✅ Seeder completado exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeders();
