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
import { seedMemories, seedFilesystem } from './memory.seeder';
import { seedSettings } from './settings.seeder';
import { seedAiPersonalities } from './ai-personality.seeder';

async function runSeeders() {
  console.log('🌱 Iniciando seeders...\n');

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

    // Ejecutar seeders en orden
    console.log('═══════════════════════════════════════');
    console.log('⚙️  SEEDING SETTINGS');
    console.log('═══════════════════════════════════════');
    await seedSettings(dataSource);

    console.log('\n═══════════════════════════════════════');
    console.log('🤖 SEEDING AI PERSONALITIES');
    console.log('═══════════════════════════════════════');
    await seedAiPersonalities(dataSource);

    console.log('\n═══════════════════════════════════════');
    console.log('📚 SEEDING MEMORIAS');
    console.log('═══════════════════════════════════════');
    await seedMemories(dataSource);

    console.log('\n═══════════════════════════════════════');
    console.log('📂 SEEDING FILESYSTEM');
    console.log('═══════════════════════════════════════');
    await seedFilesystem(dataSource);

    console.log('\n✅ Todos los seeders completados exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando seeders:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeders();
