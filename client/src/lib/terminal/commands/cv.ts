import type { Command, CommandContext, CommandResult } from '../types';

/**
 * Comando cv - Descarga el curriculum vitae
 * 
 * Uso:
 *   cv          - Inicia descarga del CV
 *   cv --info   - Muestra información del CV disponible
 *   cv -h       - Muestra ayuda
 */
export const cv: Command = {
  name: 'cv',
  description: 'Descarga el curriculum vitae',
  usage: 'cv [--info] [-h]',

  execute(args: string[], ctx: CommandContext): CommandResult {
    // Usamos rutas relativas que funcionan a través del proxy del cliente
    const downloadUrl = '/api/uploads/cv';
    const infoUrl = '/api/uploads/cv/info';
    
    // Opción -h/--help: mostrar ayuda
    if (args.includes('--help') || args.includes('-h')) {
      return {
        output: `📄 <strong>cv</strong> - Descarga el curriculum vitae

<strong>Uso:</strong>
  cv           Descarga el CV activo
  cv --info    Muestra información del CV
  cv -h        Muestra esta ayuda

<strong>Notas:</strong>
  • El CV se puede cargar desde el panel de admin (<code>admin uploads</code>)
  • Si hay múltiples CVs, se descarga el marcado como activo
  • Formatos soportados: PDF, DOC, DOCX

<strong>Alias:</strong> <code>curriculum</code>, <code>resume</code>`,
        isHtml: true
      };
    }
    
    // Opción --info: mostrar información sin descargar
    if (args.includes('--info') || args.includes('-i')) {
      return {
        output: `📄 <strong>Curriculum Vitae</strong>

  <a href="${infoUrl}" target="_blank">Ver información del CV</a>
  <a href="${downloadUrl}" target="_blank">Descargar CV directamente</a>

<span style="color: #888">Tip: Ejecuta <code>cv</code> sin argumentos para descargar</span>
<span style="color: #888">     El CV se gestiona desde <code>admin uploads</code></span>`,
        isHtml: true
      };
    }

    // Descarga del CV - abrir link directamente
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'curriculum-vitae.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return {
      output: `✅ <strong>Descargando CV...</strong>

Si la descarga no inicia automáticamente:
<a href="${downloadUrl}" target="_blank">Descargar CV</a>

<span style="color: #888">Tip: Usa <code>cv --info</code> para ver información del CV</span>`,
      isHtml: true
    };
  },
};
