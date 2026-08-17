/**
 * Bloques generados dentro de las memorias INDEX y DOCS.
 *
 * Las secciones de proyectos se delimitan con marcadores y se **reemplazan**
 * completas en cada corrida. Antes se appendeaban, y reejecutar el seeder —cosa
 * que pasa en cada deploy— duplicaba cada proyecto en el perfil: el RAG terminaba
 * leyendo el mismo texto varias veces.
 *
 * Vive fuera del servicio porque lo comparten los dos caminos de carga: el panel
 * (`ProjectsService`) y el seeder de archivos (`seedProjects`).
 */
export const SECTION_START = '<!-- projects:auto:start -->';
export const SECTION_END = '<!-- projects:auto:end -->';

/**
 * Reemplaza el bloque generado entre marcadores. Si todavía no existen,
 * sustituye el cuerpo de la sección indicada (hasta el próximo `---` o `## `)
 * y deja los marcadores puestos para las corridas siguientes.
 */
export function replaceSection(content: string, heading: string, block: string): string {
  const wrapped = `${SECTION_START}\n${block}\n${SECTION_END}`;

  const start = content.indexOf(SECTION_START);
  const end = content.indexOf(SECTION_END);
  if (start !== -1 && end !== -1 && end > start) {
    return content.slice(0, start) + wrapped + content.slice(end + SECTION_END.length);
  }

  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) {
    return `${content.trimEnd()}\n\n${heading}\n\n${wrapped}\n`;
  }

  const bodyStart = headingIndex + heading.length;
  const rest = content.slice(bodyStart);
  const boundary = rest.match(/\n---\n|\n## /);
  const bodyEnd = boundary?.index !== undefined ? bodyStart + boundary.index : content.length;

  return `${content.slice(0, bodyStart)}\n\n${wrapped}\n${content.slice(bodyEnd)}`;
}

/**
 * Detecta el stack de un documento a partir de su contenido.
 *
 * Se usa para el bloque generado cuando no hay un `techStack` curado en el
 * frontmatter del proyecto.
 */
export function detectTechStack(content: string): string[] {
  const techSet = new Set<string>();

  // Patrones de tecnologías conocidas
  const techPatterns = [
    /\b(SvelteKit|Svelte)\b/gi,
    /\b(React|React\.js|ReactJS)\b/gi,
    /\b(Vue|Vue\.js|VueJS)\b/gi,
    /\b(Angular)\b/gi,
    /\b(Node\.?js|NodeJS)\b/gi,
    /\b(NestJS|Nest\.js)\b/gi,
    /\b(Express|Express\.js)\b/gi,
    /\b(TypeScript|TS)\b/gi,
    /\b(JavaScript|JS)\b/gi,
    /\b(Python)\b/gi,
    /\b(\.NET|DotNet|C#|CSharp)\b/gi,
    /\b(Docker|Dockerfile)\b/gi,
    /\b(MySQL|PostgreSQL|Postgres|MongoDB|Redis|SQLite)\b/gi,
    /\b(GraphQL|REST|RESTful)\b/gi,
    /\b(AWS|Azure|GCP|Google Cloud)\b/gi,
    /\b(WebSocket|Socket\.io)\b/gi,
    /\b(Nginx|Apache)\b/gi,
    /\b(Linux|Ubuntu|Debian)\b/gi,
    /\b(Git|GitHub|GitLab)\b/gi,
    /\b(CI\/CD|Jenkins|GitHub Actions)\b/gi,
    /\b(Axios|Fetch)\b/gi,
    /\b(ESC-POS|ZPL|Raw Printing)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((m) => {
        // Normalizar nombres
        let normalized = m;
        if (/node\.?js/i.test(m)) normalized = 'Node.js';
        if (/react\.?js/i.test(m)) normalized = 'React';
        if (/vue\.?js/i.test(m)) normalized = 'Vue.js';
        if (/nest\.?js/i.test(m)) normalized = 'NestJS';
        if (/express\.?js/i.test(m)) normalized = 'Express';
        if (/typescript/i.test(m)) normalized = 'TypeScript';
        if (/javascript/i.test(m)) normalized = 'JavaScript';
        if (/socket\.io/i.test(m)) normalized = 'Socket.io';
        if (/\.net|dotnet/i.test(m)) normalized = '.NET';
        if (/c#|csharp/i.test(m)) normalized = 'C#';
        if (/postgresql|postgres/i.test(m)) normalized = 'PostgreSQL';

        techSet.add(normalized);
      });
    }
  }

  return Array.from(techSet);
}
