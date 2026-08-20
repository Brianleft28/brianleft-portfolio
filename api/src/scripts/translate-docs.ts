/**
 * Traduce al inglés los `.md` del portfolio y los deja en `<memoria>/en/**`.
 *
 * La traducción se genera acá, se revisa a mano y se commitea: no se traduce en
 * vivo. Es un portfolio, y lo que dice en inglés lo tiene que leer su dueño
 * antes de publicarlo. Los seeders levantan `en/<misma ruta>` a las columnas
 * `content_en`, y todo lo que no esté traducido cae al español.
 *
 * Uso:
 *   npx ts-node src/scripts/translate-docs.ts               # lo que falte o esté desactualizado
 *   npx ts-node src/scripts/translate-docs.ts --force        # todo de nuevo
 *   npx ts-node src/scripts/translate-docs.ts --only vus     # sólo las rutas que contengan "vus"
 *   npx ts-node src/scripts/translate-docs.ts --dry          # qué haría, sin llamar a Gemini
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Modelo de traducción, deliberadamente **fuera** de la cadena del chat
 * (`GEMINI_MODEL` + `GEMINI_MODEL_FALLBACK`).
 *
 * El free tier tiene cupo diario por modelo: traducir con el mismo modelo que
 * atiende a los visitantes le come el cupo al asistente. Traducir es además más
 * exigente que generar keywords, así que tampoco sirve un `-lite`.
 */
const MODEL = process.env.TRANSLATE_MODEL || 'gemini-3.5-flash';

const MEMORY_ROOT =
  process.env.MEMORY_PATH || path.join(__dirname, '../../../client/src/lib/data/memory');

/** Carpeta destino: espeja la estructura del origen. */
const TARGET_DIR = 'en';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY = args.includes('--dry');
const ONLY = args[args.indexOf('--only') + 1] && args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

interface GeminiResponse {
  candidates: Array<{
    content?: { parts?: Array<{ text: string }> };
    finishReason?: string;
  }>;
}

const BODY_PROMPT = `Sos un traductor técnico. Traducís del español al inglés la documentación de un portfolio de desarrollo de software.

REGLAS (importantes):
- Devolvés el fragmento markdown traducido y NADA más: sin explicaciones, sin envolverlo en \`\`\`.
- Lo que recibís NO tiene frontmatter y la traducción tampoco tiene que tenerlo: no agregues un bloque YAML entre --- ni inventes campos.
- No agregues, resumas ni completes contenido. Lo que no está en el original no existe.
- NO traducís: slugs, nombres de comandos, rutas de archivo, nombres de tecnologías, nombres propios, ni identificadores de código.
- Dentro de los bloques de código: NO tocás nombres de comandos, flags, rutas ni código. SÍ traducís los comentarios (lo que va después de # o //) y el texto en lenguaje natural que se le pasa a un comando —por ejemplo la pregunta en \`ai ¿en qué proyectos trabajaste?\`, que un visitante angloparlante escribiría en inglés.
- En los bloques \`\`\`mermaid traducís las etiquetas de los nodos, nunca la sintaxis ni los ids.
- El tipo de cada bloque no cambia: si el original es un bloque sin lenguaje con un diagrama en arte ASCII, la traducción también lo es. Nunca conviertas arte ASCII en mermaid, ni al revés, ni agregues un diagrama que no estaba.
- Mantenés la estructura markdown exacta: mismos encabezados, mismas listas, mismos emojis, mismos saltos de línea.
- Si hay un índice con enlaces internos (\`[Texto](#ancla)\`), regenerás las anclas a partir de los títulos ya traducidos, en minúsculas y con guiones. Un índice que apunta a las anclas del original queda roto.
- Los placeholders con doble llave, como {{owner_name}}, se copian literales.
- Inglés profesional y natural, no una traducción literal. Es material para conseguir trabajo.

FRAGMENTO:
`;

const FIELDS_PROMPT = `Traducí del español al inglés estos campos de la ficha de un proyecto de software.
Devolvés exactamente el mismo formato, una línea por campo, sin comillas y sin nada más.
No traduzcas nombres propios ni de tecnologías.

`;

/** Se acabó el cupo del día para este modelo: reintentar no cambia nada. */
class QuotaExhausted extends Error {}

async function ask(prompt: string, attempt = 1): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 32768 },
      }),
    },
  );

  if (response.status === 429) {
    throw new QuotaExhausted(
      `cuota diaria de "${MODEL}" agotada (free tier). Probá mañana, o con TRANSLATE_MODEL=<otro modelo>.`,
    );
  }

  // 503 es congestión del lado de Google y suele pasarse sola.
  if (response.status === 503 && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
    return ask(prompt, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  const data: GeminiResponse = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error(`Respuesta vacía (finishReason: ${candidate?.finishReason ?? 'desconocido'})`);
  }

  if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`Traducción cortada (finishReason: ${candidate.finishReason})`);
  }

  // Por si igual devuelve el texto envuelto en un bloque de código.
  return text.replace(/^```(?:markdown|md|yaml)?\s*\n/, '').replace(/\n```\s*$/, '').trim();
}

/**
 * Separa el frontmatter del cuerpo.
 *
 * El frontmatter NO se le manda al modelo. En la primera versión sí, y con un
 * `index.md` que no tenía ninguno se inventó uno entero —techStack con React,
 * PostgreSQL y AWS— además de traducir el `slug`. El frontmatter es dato
 * estructural: se copia byte a byte y sólo se sustituyen `title` y `summary`.
 */
function splitFrontmatter(raw: string): { frontmatter: string | null; body: string } {
  const match = raw.replace(/^\uFEFF/, '').match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match
    ? { frontmatter: match[0], body: raw.slice(match[0].length) }
    : { frontmatter: null, body: raw };
}

/** Sólo `title` y `summary`: el resto del bloque queda igual. */
async function translateFrontmatter(frontmatter: string): Promise<string> {
  const fields = ['title', 'summary'] as const;
  const present = fields
    .map((field) => ({ field, value: readField(frontmatter, field) }))
    .filter((entry): entry is { field: (typeof fields)[number]; value: string } => !!entry.value);

  if (present.length === 0) return frontmatter;

  const answer = await ask(
    FIELDS_PROMPT + present.map(({ field, value }) => `${field}: ${value}`).join('\n'),
  );

  let result = frontmatter;
  for (const { field, value } of present) {
    const translated = readField(answer, field);
    if (!translated || translated === value) continue;
    result = result.replace(
      new RegExp(`^(\\s*${field}\\s*:).*$`, 'm'),
      (_full, prefix: string) => `${prefix} "${translated.replace(/^["']|["']$/g, '')}"`,
    );
  }

  return result;
}

function readField(text: string, field: string): string {
  const match = text.match(new RegExp(`^\\s*${field}\\s*:\\s*(.+)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^["']|["']$/g, '').trim();
}

async function translate(content: string): Promise<string> {
  const { frontmatter, body } = splitFrontmatter(content);

  let englishBody = await ask(BODY_PROMPT + body.trim());

  // Cinturón y tiradores: si igual devolvió un frontmatter, se descarta.
  if (!frontmatter && englishBody.startsWith('---')) {
    englishBody = splitFrontmatter(englishBody).body.trim();
  }

  const englishFrontmatter = frontmatter ? await translateFrontmatter(frontmatter) : '';
  return `${englishFrontmatter}${englishBody}\n`;
}

/**
 * Los lenguajes de los bloques de código, en orden.
 *
 * Es la comprobación más barata de que el modelo tradujo en vez de reescribir:
 * con `TECHNICAL.md` convirtió por su cuenta dos diagramas en arte ASCII a
 * bloques \`\`\`mermaid —y le salieron con errores de sintaxis— sin que nada lo
 * avisara. Si esta lista cambia, la traducción no es una traducción.
 */
function fenceSignature(markdown: string): string[] {
  return [...markdown.matchAll(/^```([a-zA-Z]*)/gm)].map((m) => m[1] || 'plain');
}

/** Todos los `.md` del árbol, menos los que ya son traducciones. */
function collect(dir: string, base = dir): string[] {
  const found: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === TARGET_DIR) continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collect(full, base));
    else if (entry.name.endsWith('.md')) found.push(path.relative(base, full));
  }

  return found.sort();
}

/**
 * Huellas del original con el que se produjo cada traducción.
 *
 * Antes esto se resolvía comparando fechas de modificación, y era frágil: basta
 * con corregir a mano una traducción —o que un checkout toque los archivos— para
 * que la próxima corrida decida retraducir y se lleve puestas las correcciones.
 * Con el hash del original, "al día" significa lo que tiene que significar: el
 * texto fuente no cambió desde que se tradujo.
 */
const MANIFEST = path.join(MEMORY_ROOT, TARGET_DIR, '.translations.json');

function readManifest(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
  } catch {
    return {};
  }
}

function writeManifest(manifest: Record<string, string>): void {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

function hash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function needsWork(relative: string, source: string, target: string, manifest: Record<string, string>): boolean {
  if (FORCE || !fs.existsSync(target)) return true;

  const known = manifest[relative];
  if (known) return known !== hash(fs.readFileSync(source, 'utf-8'));

  // Sin huella registrada —traducciones anteriores a este manifiesto— se cae al
  // criterio viejo de fechas.
  return fs.statSync(source).mtimeMs > fs.statSync(target).mtimeMs;
}

async function main() {
  if (!GEMINI_API_KEY && !DRY) {
    console.error('❌ GEMINI_API_KEY no está configurada en .env');
    process.exit(1);
  }

  if (!fs.existsSync(MEMORY_ROOT)) {
    console.error(`❌ No existe ${MEMORY_ROOT}`);
    process.exit(1);
  }

  console.log(`📁 Origen: ${MEMORY_ROOT}`);
  console.log(`🌐 Destino: ${path.join(MEMORY_ROOT, TARGET_DIR)}`);
  console.log(`🤖 Modelo: ${MODEL}${DRY ? '  (dry run)' : ''}\n`);

  const manifest = readManifest();
  const files = collect(MEMORY_ROOT).filter((f) => !ONLY || f.includes(ONLY));
  let translated = 0;
  let skipped = 0;
  const failed: string[] = [];
  const suspicious: string[] = [];

  for (const relative of files) {
    const source = path.join(MEMORY_ROOT, relative);
    const target = path.join(MEMORY_ROOT, TARGET_DIR, relative);
    const content = fs.readFileSync(source, 'utf-8');

    if (content.trim().length < 20) {
      console.log(`⏭️  ${relative} — vacío o casi, no hay nada que traducir.`);
      skipped++;
      continue;
    }

    if (!needsWork(relative, source, target, manifest)) {
      console.log(`⏭️  ${relative} — la traducción está al día.`);
      skipped++;
      continue;
    }

    if (DRY) {
      console.log(`📝 ${relative} → ${path.join(TARGET_DIR, relative)}`);
      translated++;
      continue;
    }

    process.stdout.write(`🤖 ${relative} … `);
    try {
      const english = await translate(content);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, english, 'utf-8');
      manifest[relative] = hash(content);
      writeManifest(manifest);

      const before = fenceSignature(content).join(',');
      const after = fenceSignature(english).join(',');
      if (before !== after) {
        console.log(`⚠️  ${english.length} caracteres — los bloques de código no coinciden`);
        console.log(`   original:   [${before}]`);
        console.log(`   traducción: [${after}]`);
        suspicious.push(relative);
      } else {
        console.log(`✅ ${english.length} caracteres`);
      }
      translated++;
    } catch (error) {
      console.log(`❌ ${(error as Error).message}`);
      failed.push(relative);

      // Sin cupo no tiene sentido seguir gastando el resto de la lista en 429.
      if (error instanceof QuotaExhausted) {
        const pending = files.slice(files.indexOf(relative) + 1);
        if (pending.length) console.log(`⏸️  Quedan sin traducir: ${pending.join(', ')}`);
        break;
      }
    }

    // La cuota del free tier es por minuto: sin esto se agota a mitad de camino.
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log(`\n🎉 Traducidos: ${translated} · sin cambios: ${skipped} · fallados: ${failed.length}`);
  if (failed.length) console.log(`   Revisar: ${failed.join(', ')}`);
  if (suspicious.length) {
    console.log(`⚠️  Con bloques de código distintos al original: ${suspicious.join(', ')}`);
    console.log('   Reintentar con --force, o corregir esos archivos a mano.');
  }
  console.log('\n👉 Leé lo que salió antes de commitear, y después corré `npm run seed`.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
