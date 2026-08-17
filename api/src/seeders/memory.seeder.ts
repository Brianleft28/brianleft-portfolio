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

  // `index.md` y `memory.md` son del dueño, no del sistema: los crea
  // `bootstrapOwner()` / `MemoryService` con su userId. Seedearlos también como
  // memorias globales dejaba dos INDEX y dos DOCS compitiendo en el RAG.
  const OWNER_FILES = ['index.md', 'memory.md'];
  const files = fs
    .readdirSync(memoryPath)
    .filter((file) => file.endsWith('.md') && !OWNER_FILES.includes(file));


  if (files.length === 0) {
    console.warn('⚠️ No se encontraron archivos .md en la carpeta de memorias.');
    return;
  }

  for (const file of files) {
    const metaFilePath = path.join(memoryPath, file);
    const content = fs.readFileSync(metaFilePath, 'utf-8');
    const slug = file.replace('.md', '');
    const title = extractTitle(content) || slug;
    
    let type = MemoryType.DOCS;
    if (slug === 'meta') type = MemoryType.META;
    else if (slug === 'index') type = MemoryType.INDEX;
    else if (slug === 'memory') type = MemoryType.DOCS;
    else type = MemoryType.CUSTOM;

    // Verificar si ya existe la memoria global
    const existing = await memoryRepo.findOne({ 
      where: { slug, userId: IsNull() } 
    });
    
    if (existing) {
      console.log(`⏭️ Memoria global "${slug}" ya existe.`);
    } else {
      const memory = memoryRepo.create({
        type,
        slug,
        title,
        content,
        priority: 10,
        userId: null, // GLOBAL - disponible para todos los usuarios
      });
      await memoryRepo.save(memory);
      console.log(`✅ Memoria global "${slug}" creada.`);
    }
  }

  console.log('🎉 Seeding de memorias base completado.');
}

// Utilidad para extraer título del contenido markdown
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(?:PROYECTO:\s*)?(.+)$/m);
  return match ? match[1].trim() : null;
}
