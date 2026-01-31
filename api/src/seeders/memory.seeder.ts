import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Memory, MemoryType } from '../entities/memory.entity';
import { Folder } from '../entities/folder.entity';
import { File, FileType } from '../entities/file.entity';
import { MemoryKeyword } from '../entities/memory-keyword.entity'; 

export async function seedMemories(dataSource: DataSource): Promise<void> {
  // borar memorias existentes
 await dataSource.getRepository(MemoryKeyword).createQueryBuilder().delete().execute();
 await dataSource.getRepository(Memory).createQueryBuilder().delete().execute();
  const memoryRepo = dataSource.getRepository(Memory);
  const memoryPath = process.env.MEMORY_PATH || '/app/data/memory';
  console.log('📁 Verificando memorias base desde:', memoryPath);

  if (!fs.existsSync(memoryPath)) {
    console.warn('⚠️ Carpeta de memorias no encontrada, saltando seeder de memorias.');
    return;
  }

  // Cargar solo memorias base (index, meta)
  const baseFiles = [
    { file: 'meta.md', type: MemoryType.META, slug: 'meta' },
  ];

  for (const { file, type, slug } of baseFiles) {
    const filePath = path.join(memoryPath, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const title = extractTitle(content) || slug;

    const existing = await memoryRepo.findOne({ where: { slug, userId: 1 } });
    if (existing) {
      console.log(`⏭️ Memoria base "${slug}" ya existe.`);
      continue;
    }

    const memory = memoryRepo.create({
      type,
      slug,
      title,
      content,
      priority: type === MemoryType.META ? 10 : 5,
      userId: 1,
    });
    await memoryRepo.save(memory);
    console.log(`✅ Memoria base creada: ${slug}`);
  }

  // NO SE CARGAN PROYECTOS DESDE ARCHIVOS. Se gestionan desde el admin.
  console.log('🎉 Seeding de memorias base completado.');
}

export async function seedFilesystem(dataSource: DataSource): Promise<void> {
  const folderRepo = dataSource.getRepository(Folder);
  const fileRepo = dataSource.getRepository(File);

  let root = await folderRepo.findOne({ where: { name: 'C:', userId: 1 } });

  if (root) {
    console.log('⏭️ Estructura de carpetas ya existe.');
  } else {
    console.log('📂 Creando estructura inicial del filesystem...');
    root = folderRepo.create({ name: 'C:', parentId: null, order: 0, userId: 1 });
    await folderRepo.save(root);

    const proyectos = folderRepo.create({
      name: 'proyectos',
      parentId: root.id,
      order: 1,
      userId: 1,
    });
    await folderRepo.save(proyectos);

    const apps = folderRepo.create({ name: 'apps', parentId: root.id, order: 2, userId: 1 });
    await folderRepo.save(apps);
  }

  // Crear LEEME.md genérico en la raíz
  const existingLeeme = await fileRepo.findOne({
    where: { folderId: root.id, name: 'LEEME.md', userId: 1 },
  });
  if (!existingLeeme) {
    const leemeContent = `# Bienvenido a tu Portfolio Interactivo

Esta es la raíz de tu sistema de archivos virtual.

## Primeros Pasos

1.  **Configuración:** Andá al panel de \`/admin/settings\` para personalizar tu información, redes sociales y apariencia.
2.  **Crear Contenido:** Desde el área de administración, podés empezar a crear tus "memorias" (que son las fuentes de datos para la IA) y a construir tu sistema de archivos virtual.
3.  **Asistente IA:** Una vez que tengas contenido, la IA podrá responder preguntas sobre tus proyectos y tu experiencia.

## Comandos Útiles

*   Abrí la terminal con \`CTRL\` + \`Ñ\`.
*   Usá \`ls\` para listar archivos y carpetas.
*   Usá \`cd [carpeta]\` para navegar.
*   Usá \`cat [archivo]\` para leer el contenido de un archivo.
`;
    const leeme = fileRepo.create({
      name: 'LEEME.md',
      type: FileType.MARKDOWN,
      folderId: root.id,
      userId: 1,
      content: leemeContent,
    });
    await fileRepo.save(leeme);
    console.log('📄 Creado LEEME.md genérico en la raíz.');
  }

  // NO SE CREAN ARCHIVOS DE PROYECTOS. El filesystem arranca limpio.
  console.log('🎉 Seeding de filesystem completado.');
}

// ... (las funciones de utilidad como extractTitle y extractSummary pueden quedar)
function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(?:PROYECTO:\s*)?(.+)$/m);
  return match ? match[1].trim() : null;
}
