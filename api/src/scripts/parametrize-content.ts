/**
 * Script para parametrizar el contenido de las memorias
 * Reemplaza nombres y datos hardcodeados por placeholders {{variable}}
 * 
 * Ejecutar: npx ts-node src/scripts/parametrize-content.ts
 */

import { DataSource } from 'typeorm';
import { Memory } from '../entities/memory.entity';
import { MemoryKeyword } from '../entities/memory-keyword.entity';
import * as dotenv from 'dotenv';

dotenv.config();

// Mapeo de valores hardcodeados a placeholders
const REPLACEMENTS: Array<{ pattern: RegExp; placeholder: string }> = [
  // Rol (PRIMERO para evitar conflictos con nombres parciales)
  { pattern: /Full Stack Developer & DevOps \| Integrador de Sistemas/gi, placeholder: '{{owner_role}}' },
  { pattern: /Full Stack Developer/gi, placeholder: '{{owner_role_short}}' },
  
  // Nombres
  { pattern: /Brian Benegas/gi, placeholder: '{{owner_name}}' },
  { pattern: /\bBrian\b/g, placeholder: '{{owner_first_name}}' },
  { pattern: /\bBenegas\b/g, placeholder: '{{owner_last_name}}' },
  
  // Emails
  { pattern: /contacto@brianleft\.com/gi, placeholder: '{{owner_email}}' },
  { pattern: /contactobrianleft@gmail\.com/gi, placeholder: '{{owner_email_alt}}' },
  
  // URLs
  { pattern: /github\.com\/brianleft28/gi, placeholder: '{{github_url}}' },
  { pattern: /linkedin\.com\/in\/brian-benegas/gi, placeholder: '{{linkedin_url}}' },
  { pattern: /brianleft28/gi, placeholder: '{{github_username}}' },
  
  // Ubicación
  { pattern: /\bArgentina\b/gi, placeholder: '{{owner_location}}' },
];

async function main() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307'),
    username: process.env.DB_USER || 'portfolio_user',
    password: process.env.DB_PASSWORD || 'portfolio_pass',
    database: process.env.DB_NAME || 'portfolio_db',
    entities: [Memory, MemoryKeyword],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Conectado a la base de datos\n');

  const memoryRepo = dataSource.getRepository(Memory);
  const memories = await memoryRepo.find();

  console.log(`📚 Procesando ${memories.length} memorias...\n`);
  console.log('=' .repeat(60));

  for (const memory of memories) {
    console.log(`\n📄 ${memory.title}`);
    
    if (!memory.content) {
      console.log('   ⚠️ Sin contenido, saltando...');
      continue;
    }

    let newContent = memory.content;
    let replacementsCount = 0;

    for (const { pattern, placeholder } of REPLACEMENTS) {
      const matches = newContent.match(pattern);
      if (matches) {
        replacementsCount += matches.length;
        newContent = newContent.replace(pattern, placeholder);
        console.log(`   🔄 ${pattern.source} → ${placeholder} (${matches.length}x)`);
      }
    }

    if (replacementsCount > 0) {
      await memoryRepo.update(memory.id, { content: newContent });
      console.log(`   ✅ ${replacementsCount} reemplazos guardados`);
    } else {
      console.log('   ℹ️ Sin cambios necesarios');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Parametrización completada!\n');
  console.log('Ahora el contenido usa placeholders como {{owner_name}}');
  console.log('El MemoryService debe reemplazarlos con valores de Settings en runtime.\n');

  await dataSource.destroy();
}

main().catch(console.error);
