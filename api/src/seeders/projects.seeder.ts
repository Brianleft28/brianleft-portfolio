import { INestApplicationContext } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { Memory, MemoryType } from '../entities/memory.entity';
import { MemoryKeyword } from '../entities/memory-keyword.entity';
import { MemoryService } from '../modules/memory/memory.service';
import { FilesystemService } from '../modules/filesystem/filesystem.service';
import { readTranslation } from './memory.seeder';

interface ProjectDoc {
  slug: string;
  title: string;
  summary: string;
  priority: number;
  techStack: string[];
  keywords: string[];
  content: string;
  /** `en/projects/<archivo>`, si ya se tradujo. `null` = se sirve en español. */
  contentEn: string | null;
  titleEn: string | null;
  summaryEn: string | null;
  file: string;
}

/**
 * Carga los proyectos versionados en `${MEMORY_PATH}/projects/*.md` como memorias
 * de tipo PROJECT del usuario dueño, y sincroniza el filesystem virtual.
 *
 * Es idempotente: reejecutarlo actualiza el contenido existente y regenera
 * (no acumula) las secciones de proyectos de las memorias INDEX y DOCS.
 *
 * No se usa `ProjectsService.createProject()` porque este camino trae las
 * keywords y el summary curados desde el frontmatter, y no necesita gastar
 * llamadas al LLM por cada archivo. Pero la escritura de las secciones de
 * index/memory sí es compartida: la hace `regenerateProjectSections()`, la
 * misma que corre al cargar un proyecto desde el panel.
 */
export async function seedProjects(
  app: INestApplicationContext,
  userId: number,
): Promise<void> {
  const memoryPath = process.env.MEMORY_PATH || '/app/data/memory';
  const projectsPath = path.join(memoryPath, 'projects');

  if (!fs.existsSync(projectsPath)) {
    console.warn(`⚠️  No existe ${projectsPath}, saltando seeder de proyectos.`);
    return;
  }

  const files = fs
    .readdirSync(projectsPath)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.warn('⚠️  No se encontraron archivos .md en la carpeta de proyectos.');
    return;
  }

  const dataSource = app.get(DataSource);
  const memoryRepo = dataSource.getRepository(Memory);
  const keywordRepo = dataSource.getRepository(MemoryKeyword);
  const memoryService = app.get(MemoryService);

  const docs: ProjectDoc[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(projectsPath, file), 'utf-8');
    const { data, body } = parseFrontmatter(raw);

    const slug = str(data.slug) || file.replace(/\.md$/, '');
    const title = str(data.title) || extractTitle(body) || slug;
    // La traducción es el mismo `.md` con el frontmatter traducido: de ahí sale
    // el summary en inglés, y el cuerpo va a `content_en`.
    const raw_en = readTranslation(memoryPath, path.join('projects', file));
    const translated = raw_en ? parseFrontmatter(raw_en) : null;

    const doc: ProjectDoc = {
      slug,
      title,
      summary: str(data.summary),
      priority: Number(data.priority ?? 0) || 0,
      techStack: list(data.techStack),
      keywords: normalizeKeywords(list(data.keywords)),
      content: body,
      contentEn: translated?.body ?? null,
      titleEn: translated ? str(translated.data.title) || null : null,
      summaryEn: translated ? str(translated.data.summary) || null : null,
      file,
    };

    if (doc.keywords.length === 0) {
      // Sin keywords en el frontmatter caemos al generador con IA (requiere GEMINI_API_KEY)
      doc.keywords = normalizeKeywords(
        await memoryService.generateKeywords(doc.title, doc.content),
      );
    }

    docs.push(doc);
  }

  docs.sort((a, b) => b.priority - a.priority || a.slug.localeCompare(b.slug));

  for (const doc of docs) {
    const existing = await memoryRepo.findOne({ where: { slug: doc.slug, userId } });

    if (existing) {
      await memoryRepo.update(existing.id, {
        type: MemoryType.PROJECT,
        title: doc.title,
        content: doc.content,
        contentEn: doc.contentEn,
        titleEn: doc.titleEn ?? existing.titleEn,
        summary: doc.summary || existing.summary,
        summaryEn: doc.summaryEn ?? existing.summaryEn,
        priority: doc.priority,
        active: true,
      });
      await keywordRepo.delete({ memoryId: existing.id });
      await saveKeywords(keywordRepo, existing.id, doc.keywords);
      console.log(`♻️  Proyecto "${doc.slug}" actualizado (${doc.keywords.length} keywords).`);
    } else {
      const created = await memoryService.create(
        {
          type: MemoryType.PROJECT,
          slug: doc.slug,
          title: doc.title,
          content: doc.content,
          summary: doc.summary,
          priority: doc.priority,
          keywords: doc.keywords,
        },
        userId,
      );
      // `CreateMemoryDto` no expone las traducciones: se completan aparte para
      // no ensanchar la API pública del panel con campos que sólo usa el seeder.
      if (doc.contentEn || doc.summaryEn || doc.titleEn) {
        await memoryRepo.update(created.id, {
          contentEn: doc.contentEn,
          titleEn: doc.titleEn,
          summaryEn: doc.summaryEn,
        });
      }
      console.log(
        `✅ Proyecto "${doc.slug}" creado (id ${created.id}, ${doc.keywords.length} keywords).`,
      );
    }
  }

  // Filesystem virtual: crea/actualiza C:/proyectos/<slug>/README.md
  const sync = await app.get(FilesystemService).syncWithProjects(userId);
  console.log(
    `📂 Filesystem sincronizado — nuevos: [${sync.created.join(', ') || '—'}], ` +
      `existentes: [${sync.existing.join(', ') || '—'}].`,
  );

  // Misma función que usa la carga desde el panel: un solo lugar escribe estos bloques.
  const techStackBySlug = Object.fromEntries(docs.map((d) => [d.slug, d.techStack]));
  await memoryService.regenerateProjectSections(userId, techStackBySlug);

  await warnAboutOrphans(memoryRepo, userId, docs);
}

/**
 * Avisa de proyectos que están en la base pero ya no tienen `.md` que los
 * respalde: típicamente, un archivo renombrado o borrado del repo.
 *
 * No se borran solos a propósito. Un proyecto cargado desde el panel tampoco
 * tiene archivo, y una poda automática se lo llevaría puesto en el próximo
 * deploy. Mejor avisar y que la baja sea una decisión explícita.
 */
async function warnAboutOrphans(
  memoryRepo: Repository<Memory>,
  userId: number,
  docs: ProjectDoc[],
): Promise<void> {
  const fromFiles = new Set(docs.map((d) => d.slug));
  const stored = await memoryRepo.find({
    where: { type: MemoryType.PROJECT, userId },
    select: ['slug'],
  });

  const orphans = stored.map((m) => m.slug).filter((slug) => !fromFiles.has(slug));
  if (orphans.length === 0) return;

  console.warn(
    `⚠️  Proyectos en la base sin archivo en projects/: [${orphans.join(', ')}].\n` +
      '   Si los cargaste desde el panel, está bien. Si borraste el .md y querés\n' +
      '   darlos de baja: DELETE /projects/<slug> o el botón del panel.',
  );
}

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────

async function saveKeywords(
  keywordRepo: Repository<MemoryKeyword>,
  memoryId: number,
  keywords: string[],
): Promise<void> {
  if (keywords.length === 0) return;
  await keywordRepo.save(keywords.map((keyword) => keywordRepo.create({ memoryId, keyword })));
}

function normalizeKeywords(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const keyword = String(value).trim().toLowerCase();
    if (keyword) seen.add(keyword);
  }
  return Array.from(seen);
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(?:Portfolio:\s*)?(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Parser mínimo de frontmatter YAML para el subconjunto que usamos:
 * `clave: valor`, `clave: "valor entre comillas"` y `clave: [a, b, "c d"]`.
 * Evita sumar una dependencia sólo para leer seis archivos que controlamos.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const normalized = raw.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: normalized.trim() };

  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!key) continue;

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = splitInlineList(rawValue.slice(1, -1));
    } else {
      data[key] = unquote(rawValue);
    }
  }

  return { data, body: normalized.slice(match[0].length).trim() };
}

function splitInlineList(inner: string): string[] {
  return inner
    .split(',')
    .map((item) => unquote(item.trim()))
    .filter(Boolean);
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
    (value.startsWith("'") && value.endsWith("'") && value.length > 1)
  ) {
    return value.slice(1, -1);
  }
  return value;
}
