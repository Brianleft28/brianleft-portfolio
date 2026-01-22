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

  // Path a los archivos de memoria (montado via Docker o ruta local)
  // En Docker: /app/data/memory (volumen montado)
  // En desarrollo local: puede variar
  const memoryPath = process.env.MEMORY_PATH || '/app/data/memory';

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

    // Verificar si ya existe para userId=1
    const existing = await memoryRepo.findOne({ where: { slug, userId: 1 } });
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
      userId: 1, // Admin user
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

      // Verificar si ya existe para userId=1
      const existing = await memoryRepo.findOne({ where: { slug, userId: 1 } });
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
        userId: 1, // Admin user
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

  // Verificar si ya existe estructura para userId=1
  let root = await folderRepo.findOne({ where: { name: 'C:', userId: 1 } });
  let proyectos: Folder | null;
  let apps: Folder | null;

  if (root) {
    console.log('📂 Estructura de carpetas existente encontrada');
    proyectos = await folderRepo.findOne({ where: { name: 'proyectos', userId: 1 } });
    apps = await folderRepo.findOne({ where: { name: 'apps', userId: 1 } });
  } else {
    console.log('📂 Creando estructura del filesystem...');

    // 1. Crear raíz
    root = folderRepo.create({ name: 'C:', parentId: null, order: 0, userId: 1 });
    await folderRepo.save(root);

    // 2. Crear carpetas principales
    proyectos = folderRepo.create({ name: 'proyectos', parentId: root.id, order: 1, userId: 1 });
    await folderRepo.save(proyectos);

    apps = folderRepo.create({ name: 'apps', parentId: root.id, order: 2, userId: 1 });
    await folderRepo.save(apps);
  }

  console.log('📄 Verificando archivos del filesystem...');

  // 3. Crear LEEME.md en raíz (si no existe)
  const existingLeeme = await fileRepo.findOne({ where: { folderId: root.id, name: 'LEEME.md', userId: 1 } });
  if (!existingLeeme) {
    const leeme = fileRepo.create({
      name: 'LEEME.md',
      type: FileType.MARKDOWN,
      folderId: root.id,
      userId: 1,
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
* 🤖 **Asistente IA** - Preguntale lo que quieras sobre mis proyectos
* 📁 **Sistema de archivos virtual** - Navegá los proyectos como directorios
* ⚡ **Streaming de respuestas** - La IA responde en tiempo real

## ¿Querés saber más?

Abrí la terminal con \`Ctrl+Ñ\` y escribí el comando de IA para comenzar.
`,
    });
    await fileRepo.save(leeme);
    console.log('📄 Creado LEEME.md en raíz');
  } else {
    console.log('⏭️ LEEME.md ya existe en raíz');
  }

  // 4. Crear archivos para cada proyecto (si hay memorias de proyectos)
  if (proyectos) {
    const projects = await memoryRepo.find({ where: { type: MemoryType.PROJECT, userId: 1 } });

    for (const project of projects) {
      // Verificar si ya existe la carpeta del proyecto
      let projectFolder = await folderRepo.findOne({ 
        where: { name: project.slug, parentId: proyectos.id, userId: 1 } 
      });

      if (!projectFolder) {
        // Crear carpeta del proyecto
        projectFolder = folderRepo.create({
          name: project.slug,
          parentId: proyectos.id,
          order: 0,
          userId: 1,
        });
        await folderRepo.save(projectFolder);
        console.log(`📁 Creada carpeta: ${project.slug}`);
      }

      // Verificar si ya existe el README
      const existingReadme = await fileRepo.findOne({ 
        where: { folderId: projectFolder.id, name: 'README.md', userId: 1 } 
      });

      if (!existingReadme) {
        // Crear README.md con el contenido
        const readme = fileRepo.create({
          name: 'README.md',
          type: FileType.MARKDOWN,
          folderId: projectFolder.id,
          userId: 1,
          content: project.content,
        });
        await fileRepo.save(readme);
        console.log(`📄 Creado README.md para: ${project.slug}`);
      } else {
        console.log(`⏭️ README.md ya existe para: ${project.slug}`);
      }
    }
  }

  // 5. Crear archivos para la carpeta apps (si existe)
  if (apps) {
    const existingAppsLeeme = await fileRepo.findOne({ where: { folderId: apps.id, name: 'LEEME.md', userId: 1 } });
    if (!existingAppsLeeme) {
      const appsReadme = fileRepo.create({
        name: 'LEEME.md',
        type: FileType.MARKDOWN,
        folderId: apps.id,
        userId: 1,
        content: `# Aplicaciones

Esta carpeta contiene documentación sobre aplicaciones y herramientas desarrolladas.

## Asistente IA
El portfolio incluye un asistente de IA integrado en la terminal. Abrí la consola con \`Ctrl+Ñ\` y escribí el comando de IA para comenzar.

## Herramientas
Explora las diferentes herramientas disponibles en este portfolio navegando por el sistema de archivos.
`,
      });
      await fileRepo.save(appsReadme);
      console.log('📄 Creado LEEME.md en apps');
    } else {
      console.log('⏭️ LEEME.md ya existe en apps');
    }
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
  // Buscar sección "El Desafío" o "Descripción"
  const sections = ['El Desafío', 'Desafío', 'Descripción', 'Resumen', 'Objetivo'];

  for (const section of sections) {
    // Buscar el heading y capturar el contenido hasta el siguiente heading
    const regex = new RegExp(`##\\s+${section}\\s*\\n+([^#]+)`, 'i');
    const match = content.match(regex);
    if (match && match[1]) {
      // Limpiar el contenido: quitar listas, tomar primer párrafo
      const text = match[1]
        .trim()
        .split('\n')
        .filter((line) => !line.startsWith('-') && !line.startsWith('*') && line.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 20) {
        return text.slice(0, 250) + (text.length > 250 ? '...' : '');
      }
    }
  }

  // Fallback: buscar después de "Clasificación" el primer contenido útil
  const afterClassification = content.match(/##\s+Clasificación[\s\S]*?##\s+\w+\s*\n+([^#]+)/i);
  if (afterClassification && afterClassification[1]) {
    const text = afterClassification[1]
      .trim()
      .split('\n')
      .filter((line) => !line.startsWith('-') && !line.startsWith('*') && line.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 20) {
      return text.slice(0, 250) + (text.length > 250 ? '...' : '');
    }
  }

  // Último fallback: primer párrafo después del título
  const paragraphMatch = content.match(/^#[^\n]+\n+(?:##[^\n]+\n+)*([^\n#][^\n]+)/m);
  if (paragraphMatch && paragraphMatch[1]) {
    const text = paragraphMatch[1].trim();
    if (text.length > 20 && !text.startsWith('-') && !text.startsWith('*')) {
      return text.slice(0, 250) + (text.length > 250 ? '...' : '');
    }
  }

  return null;
}
