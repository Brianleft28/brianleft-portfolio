import type { Command, CommandContext, CommandResult } from '../types';
import { t, getCurrentLocale } from '$lib/i18n/helpers';

/**
 * Comando cv - Descarga el curriculum vitae
 */
export const cv: Command = {
  name: 'cv',
  description: t('terminal.cv.description'),
  usage: 'cv [-i] [-h]',

  execute(args: string[], ctx: CommandContext): CommandResult {
    // El CV se sirve en el idioma activo de la terminal; si ese idioma no
    // tiene archivo cargado, el API cae al que haya sin romper la descarga.
    const lang = getCurrentLocale();
    const downloadUrl = `/api/uploads/cv?lang=${lang}`;
    const infoUrl = `/api/uploads/cv/info?lang=${lang}`;

    // Opción -h: mostrar ayuda
    if (args.includes('-h')) {
      return {
        output: `📄 <strong>cv</strong> - ${t('terminal.cv.description')}

<strong>${t('common.usage')}:</strong>
  cv      ${t('terminal.cv.options.download')}
  cv -i   ${t('terminal.cv.options.info')}
  cv -h   ${t('terminal.cv.options.help')}

<strong>Notas:</strong>
  • ${t('terminal.cv.notes.upload')}
  • ${t('terminal.cv.notes.multiple')}
  • ${t('terminal.cv.notes.formats')}

<strong>${t('common.alias')}:</strong> <code>curriculum</code>, <code>resume</code>`,
        isHtml: true
      };
    }

    // Opción -i: mostrar información sin descargar
    if (args.includes('-i')) {
      return {
        output: `📄 <strong>${t('terminal.cv.title')}</strong>

  <a href="${infoUrl}" target="_blank">${t('terminal.cv.examples.info')}</a>
  <a href="${downloadUrl}" target="_blank">${t('terminal.cv.examples.download')}</a>

<span style="color: #888">${t('common.tip')}: <code>cv</code> ${t('terminal.cv.tip_download')}</span>
<span style="color: #888">     ${t('terminal.cv.tip_manage')} <code>admin settings</code></span>`,
        isHtml: true
      };
    }

    // Descarga del CV - abrir link directamente
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = lang === 'en' ? 'brian-benegas-resume.pdf' : 'brian-benegas-cv.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return {
      output: `✅ <strong>${t('terminal.cv.downloading')}</strong>

${t('terminal.cv.manual_download')}
<a href="${downloadUrl}" target="_blank">${t('terminal.cv.download_link')}</a>

<span style="color: #888">${t('common.tip')}: <code>cv -i</code> ${t('terminal.cv.options.info')}</span>`,
      isHtml: true
    };
  },
};
