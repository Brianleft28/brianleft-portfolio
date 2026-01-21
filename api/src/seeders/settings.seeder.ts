import { DataSource } from 'typeorm';
import { Setting } from '../entities/setting.entity';

/**
 * Seeder de configuraciones del portfolio
 * Parametriza: owner, contacto, branding, etc.
 */
export async function seedSettings(dataSource: DataSource): Promise<void> {
  const settingRepo = dataSource.getRepository(Setting);

  const settings: Partial<Setting>[] = [
    // ═══════════════════════════════════════════════════════════════
    // Owner Info
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'owner_name',
      value: 'Brian Benegas',
      type: 'string',
      category: 'owner',
      description: 'Nombre completo del dueño del portfolio',
    },
    {
      key: 'owner_first_name',
      value: 'Brian',
      type: 'string',
      category: 'owner',
      description: 'Nombre del dueño',
    },
    {
      key: 'owner_last_name',
      value: 'Benegas',
      type: 'string',
      category: 'owner',
      description: 'Apellido del dueño',
    },
    {
      key: 'owner_role',
      value: 'Full Stack Developer & DevOps | Integrador de Sistemas',
      type: 'string',
      category: 'owner',
      description: 'Rol profesional principal',
    },
    {
      key: 'owner_role_short',
      value: 'Full Stack Developer',
      type: 'string',
      category: 'owner',
      description: 'Rol profesional corto (para placeholders)',
    },
    {
      key: 'owner_location',
      value: 'Argentina',
      type: 'string',
      category: 'owner',
      description: 'Ubicación geográfica',
    },
    {
      key: 'owner_philosophy',
      value: 'El código es el medio, la arquitectura es el fin.',
      type: 'string',
      category: 'owner',
      description: 'Filosofía profesional',
    },
    {
      key: 'owner_bio',
      value: JSON.stringify({
        short: 'Full Stack Developer especializado en integraciones complejas',
        long: 'Brian se especializa en unir mundos desconectados: Web a Hardware, Nube a On-Premise, Frontend a sistemas legacy. Su metodología combina procesos estocásticos para medir rendimiento, documentación obsesiva para mitigar el caos, arquitectura primero y automatización para despliegues.',
      }),
      type: 'json',
      category: 'owner',
      description: 'Biografía corta y larga',
    },

    // ═══════════════════════════════════════════════════════════════
    // Contact Info
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'contact_email_primary',
      value: 'contacto@brianleft.com',
      type: 'string',
      category: 'contact',
      description: 'Email principal de contacto',
    },
    {
      key: 'owner_email',
      value: 'contacto@brianleft.com',
      type: 'string',
      category: 'contact',
      description: 'Email para placeholders {{owner_email}}',
    },
    {
      key: 'owner_email_alt',
      value: 'contactobrianleft@gmail.com',
      type: 'string',
      category: 'contact',
      description: 'Email alternativo para placeholders',
    },
    {
      key: 'contact_email_secondary',
      value: 'contactobrianleft@gmail.com',
      type: 'string',
      category: 'contact',
      description: 'Email secundario',
    },
    {
      key: 'contact_availability',
      value: 'Abierto a desafíos técnicos complejos en Full Stack y DevOps',
      type: 'string',
      category: 'contact',
      description: 'Estado de disponibilidad',
    },
    {
      key: 'contact_cta',
      value: 'Si buscas a alguien que entienda qué pasa desde que el usuario hace click hasta que el servidor procesa el byte, habla con Brian.',
      type: 'string',
      category: 'contact',
      description: 'Call to action para contacto',
    },

    // ═══════════════════════════════════════════════════════════════
    // Social Links
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'social_github',
      value: 'https://github.com/brianleft28',
      type: 'string',
      category: 'social',
      description: 'URL de GitHub',
    },
    {
      key: 'github_url',
      value: 'github.com/brianleft28',
      type: 'string',
      category: 'social',
      description: 'URL de GitHub sin https (para placeholders)',
    },
    {
      key: 'github_username',
      value: 'brianleft28',
      type: 'string',
      category: 'social',
      description: 'Username de GitHub',
    },
    {
      key: 'social_linkedin',
      value: 'https://linkedin.com/in/brian-benegas',
      type: 'string',
      category: 'social',
      description: 'URL de LinkedIn',
    },
    {
      key: 'linkedin_url',
      value: 'linkedin.com/in/brian-benegas',
      type: 'string',
      category: 'social',
      description: 'URL de LinkedIn sin https (para placeholders)',
    },
    {
      key: 'cv_filename',
      value: 'cv-brian-benegas.pdf',
      type: 'string',
      category: 'files',
      description: 'Nombre del archivo CV para descarga',
    },
    {
      key: 'cv_display_name',
      value: 'CV - Brian Benegas - Full Stack Developer.pdf',
      type: 'string',
      category: 'files',
      description: 'Nombre mostrado al descargar el CV',
    },
    {
      key: 'social_website',
      value: 'https://brianleft.com',
      type: 'string',
      category: 'social',
      description: 'URL del sitio web',
    },

    // ═══════════════════════════════════════════════════════════════
    // Branding
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'branding_site_title',
      value: 'Portfolio Interactivo',
      type: 'string',
      category: 'branding',
      description: 'Título del sitio',
    },
    {
      key: 'branding_site_description',
      value: 'Un Sistema Operativo web con terminal funcional y asistente IA',
      type: 'string',
      category: 'branding',
      description: 'Descripción del sitio para SEO',
    },
    {
      key: 'branding_terminal_prompt',
      value: 'C:\\',
      type: 'string',
      category: 'branding',
      description: 'Prompt de la terminal (estilo Windows)',
    },

    // ═══════════════════════════════════════════════════════════════
    // Tech Stack (para mostrar en UI)
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'tech_stack',
      value: JSON.stringify({
        backend: ['Node.js', 'NestJS', '.NET 8', 'Python'],
        frontend: ['SvelteKit', 'React'],
        databases: ['MySQL', 'MongoDB', 'Redis'],
        devops: ['Docker', 'Linux', 'Nginx', 'WebSockets'],
        integrations: ['APIs REST', 'Raw Printing', 'ESC-POS', 'ZPL'],
      }),
      type: 'json',
      category: 'tech',
      description: 'Stack tecnológico completo',
    },
  ];

  for (const setting of settings) {
    const exists = await settingRepo.findOne({ where: { key: setting.key } });
    if (!exists) {
      await settingRepo.save(setting);
      console.log(`  ✓ Setting: ${setting.key}`);
    }
  }
}
