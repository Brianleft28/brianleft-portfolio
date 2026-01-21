import type { Command, CommandContext, CommandResult } from '../types';

/**
 * Comando cv - Descarga el curriculum vitae
 * 
 * Uso:
 *   cv          - Inicia descarga del CV
 *   cv --info   - Muestra información del CV disponible
 */
export const cv: Command = {
  name: 'cv',
  description: 'Descarga el curriculum vitae',
  usage: 'cv [--info]',

  execute(args: string[], ctx: CommandContext): CommandResult {
    const apiUrl = 'http://localhost:4000';
    
    // Opción --info: mostrar información sin descargar
    if (args.includes('--info') || args.includes('-i')) {
      // Mostrar link para ver info
      return {
        output: `📄 <strong>Curriculum Vitae</strong>

  <a href="${apiUrl}/uploads/cv/info" target="_blank">Ver información del CV</a>
  <a href="${apiUrl}/uploads/cv" target="_blank">Descargar CV directamente</a>

<span style="color: #888">Tip: Ejecuta <code>cv</code> sin argumentos para descargar</span>`,
        isHtml: true
      };
    }

    // Descarga del CV - abrir link directamente
    const downloadUrl = `${apiUrl}/uploads/cv`;
    
    // En el navegador, abrimos la descarga
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
<a href="${downloadUrl}" target="_blank">${downloadUrl}</a>

<span style="color: #888">Tip: Usa <code>cv --info</code> para ver información del CV</span>`,
      isHtml: true
    };
  },
};
