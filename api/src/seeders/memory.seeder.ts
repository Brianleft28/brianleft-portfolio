import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Memory, MemoryType } from '../entities/memory.entity';
import { MemoryKeyword } from '../entities/memory-keyword.entity';
import { Folder } from '../entities/folder.entity';
import { File, FileType } from '../entities/file.entity';

// Mapeo de keywords por proyecto
const PROJECT_KEYWORDS: Record<string, string[]> = {
  'print-server': ['print', 'impresion', 'cola', 'servidor', 'windows'],
  electoral: ['electoral', 'voto', 'eleccion', 'gobierno', 'alta concurrencia'],
  portfolio: ['portfolio', 'svelte', 'terminal', 'ia', 'gemini'],
  migrador: ['migrador', 'migracion', 'datos', 'bases de datos'],
  'rutina-auth': ['rutina', 'auth', 'autenticacion', 'seguridad'],
  'soren-mirror': ['soren', 'mirror', 'espejo', 'sincronizacion'],
};

export async function seedMemories(dataSource: DataSource): Promise<void> {
  const memoryRepo = dataSource.getRepository(Memory);
  const keywordRepo = dataSource.getRepository(MemoryKeyword);

  // Path a los archivos de memoria (relativo al root del proyecto)
  const memoryPath = path.join(__dirname, '../../../client/src/lib/data/memory');

  console.log('📁 Leyendo memorias desde:', memoryPath);

  // Verificar que existe
  if (!fs.existsSync(memoryPath)) {
    console.error('❌ Carpeta de memorias no encontrada');
    return;
  }

  // 1. Cargar memorias base (index, meta, memory)
  const baseFiles = [
    { file: 'index.md', type: MemoryType.INDEX, slug: 'index' },
    { file: 'meta.md', type: MemoryType.META, slug: 'meta' },
    { file: 'memory.md', type: MemoryType.DOCS, slug: 'memory' },
  ];

  for (const { file, type, slug } of baseFiles) {
    const filePath = path.join(memoryPath, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Archivo no encontrado: ${file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const title = extractTitle(content) || slug;

    // Verificar si ya existe
    const existing = await memoryRepo.findOne({ where: { slug } });
    if (existing) {
      console.log(`⏭️ Memoria "${slug}" ya existe, saltando...`);
      continue;
    }

    const memory = memoryRepo.create({
      type,
      slug,
      title,
      content,
      priority: type === MemoryType.META ? 10 : 5,
    });

    await memoryRepo.save(memory);
    console.log(`✅ Memoria creada: ${slug} (${type})`);
  }

  // 2. Cargar proyectos
  const projectsPath = path.join(memoryPath, 'projects');
  if (fs.existsSync(projectsPath)) {
    const projectFiles = fs.readdirSync(projectsPath).filter((f) => f.endsWith('.md'));

    for (const file of projectFiles) {
      const slug = file.replace('.md', '');
      const filePath = path.join(projectsPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const title = extractTitle(content) || slug;

      // Verificar si ya existe
      const existing = await memoryRepo.findOne({ where: { slug } });
      if (existing) {
        console.log(`⏭️ Proyecto "${slug}" ya existe, saltando...`);
        continue;
      }

      const memory = memoryRepo.create({
        type: MemoryType.PROJECT,
        slug,
        title,
        content,
        summary: extractSummary(content),
        priority: 0,
      });

      const savedMemory = await memoryRepo.save(memory);

      // Crear keywords
      const keywords = PROJECT_KEYWORDS[slug] || [slug];
      for (const keyword of keywords) {
        const kw = keywordRepo.create({
          memoryId: savedMemory.id,
          keyword: keyword.toLowerCase(),
        });
        await keywordRepo.save(kw);
      }

      console.log(`✅ Proyecto creado: ${slug} (${keywords.length} keywords)`);
    }
  }

  console.log('🎉 Seeding de memorias completado');
}

export async function seedFilesystem(dataSource: DataSource): Promise<void> {
  const folderRepo = dataSource.getRepository(Folder);
  const fileRepo = dataSource.getRepository(File);
  const memoryRepo = dataSource.getRepository(Memory);

  // Verificar si ya existe estructura
  const existingRoot = await folderRepo.findOne({ where: { name: 'C:' } });
  if (existingRoot) {
    console.log('⏭️ Filesystem ya tiene estructura, saltando...');
    return;
  }

  console.log('📂 Creando estructura del filesystem...');

  // 1. Crear raíz
  const root = folderRepo.create({ name: 'C:', parentId: null, order: 0 });
  await folderRepo.save(root);

  // 2. Crear carpetas principales
  const proyectos = folderRepo.create({ name: 'proyectos', parentId: root.id, order: 1 });
  await folderRepo.save(proyectos);

  const apps = folderRepo.create({ name: 'apps', parentId: root.id, order: 2 });
  await folderRepo.save(apps);

  // 3. Crear LEEME.md en raíz
  const leeme = fileRepo.create({
    name: 'LEEME.md',
    type: FileType.MARKDOWN,
    folderId: root.id,
    content: `# Bienvenido a mi portfolio

Este portfolio es interactivo. Podés navegar usando:

* El **Explorador de Archivos** a la izquierda
* La **Terminal** abajo, abrila con \`CTRL\` + \`Ñ\` (probá comandos como \`cd\` o \`ls\`).

## Sobre este proyecto

Este sitio simula un **sistema operativo web**. No es solo una página estática con mi CV, es un demostrador técnico de cómo pienso y construyo software.

## Stack Técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Svelte 5 |
| Backend | NestJS 10 |
| Base de Datos | MySQL 8 |
| IA | Google Gemini API |
| Deploy | Docker multi-stage |

## Características

* 🖥️ **Terminal interactiva** con comandos reales (\`cd\`, \`ls\`, \`cls\`)
* 🤖 **TorvaldsAi** - Asistente IA con personalidad de Linus Torvalds
* 📁 **Sistema de archivos virtual** - Navegá los proyectos como directorios
* ⚡ **Streaming de respuestas** - La IA responde en tiempo real

## ¿Querés saber más?

Escribí \`torvalds start\` en la terminal y preguntale lo que quieras.
`,
  });
  await fileRepo.save(leeme);

  // 4. Crear archivos para cada proyecto
  const projects = await memoryRepo.find({ where: { type: MemoryType.PROJECT } });

  for (const project of projects) {
    // Crear carpeta del proyecto
    const projectFolder = folderRepo.create({
      name: project.slug,
      parentId: proyectos.id,
      order: 0,
    });
    await folderRepo.save(projectFolder);

    // Crear README.md con el contenido
    const readme = fileRepo.create({
      name: 'README.md',
      type: FileType.MARKDOWN,
      folderId: projectFolder.id,
      content: project.content,
    });
    await fileRepo.save(readme);

    console.log(`📄 Creada carpeta y README para: ${project.slug}`);
  }

  console.log('🎉 Seeding de filesystem completado');
}

// ═══════════════════════════════════════════════════════════════
// Utilidades
// ═══════════════════════════════════════════════════════════════

function extractTitle(content: string): string | null {
  // Buscar # PROYECTO: o # Título
  const match = content.match(/^#\s+(?:PROYECTO:\s*)?(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractSummary(content: string): string | null {
  // Buscar sección "El Desafío" o primer párrafo después del título
  const challengeMatch = content.match(/##\s+El Desafío\s*\n\n([^\n]+)/);
  if (challengeMatch) {
    return challengeMatch[1].trim();
  }

  // Fallback: primer párrafo
  const paragraphMatch = content.match(/^#.+\n\n([^\n#]+)/);
  return paragraphMatch ? paragraphMatch[1].trim().slice(0, 200) : null;
}
