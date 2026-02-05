import { DataSource, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Memory, MemoryType } from '../entities/memory.entity';

/**
 * Carga la memoria meta del sistema (información sobre cómo funciona el portfolio)
 * Esta memoria es GLOBAL (userId: null) y está disponible para todos los usuarios
 */
export async function seedMemories(dataSource: DataSource): Promise<void> {
  const memoryRepo = dataSource.getRepository(Memory);
  const memoryPath = process.env.MEMORY_PATH || '/app/data/memory';
  console.log('📁 Verificando memorias base desde:', memoryPath);

  if (!fs.existsSync(memoryPath)) {
    console.warn('⚠️ Carpeta de memorias no encontrada, saltando seeder de memorias.');
    return;
  }

  // Cargar solo la memoria meta (global, sin userId)
  const metaFilePath = path.join(memoryPath, 'meta.md');
  
  if (!fs.existsSync(metaFilePath)) {
    console.warn('⚠️ meta.md no encontrado, saltando.');
    return;
  }

  const content = fs.readFileSync(metaFilePath, 'utf-8');
  const title = extractTitle(content) || 'Meta';

  // Verificar si ya existe la memoria global meta
  const existing = await memoryRepo.findOne({ 
    where: { slug: 'meta', userId: IsNull() } 
  });
  
  if (existing) {
    console.log('⏭️ Memoria global "meta" ya existe.');
  } else {
    const memory = memoryRepo.create({
      type: MemoryType.META,
      slug: 'meta',
      title,
      content,
      priority: 10,
      userId: null, // GLOBAL - disponible para todos los usuarios
    });
    await memoryRepo.save(memory);
    console.log('✅ Memoria global "meta" creada.');
  }

  console.log('🎉 Seeding de memorias base completado.');
}

// Utilidad para extraer título del contenido markdown
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(?:PROYECTO:\s*)?(.+)$/m);
  return match ? match[1].trim() : null;
}
