import { DataSource } from 'typeorm';
import { Setting } from '../entities/setting.entity';

/**
 * Seeder de configuraciones del portfolio (versión white-label)
 * Inicializa las claves con valores genéricos o vacíos.
 * La personalización se realiza desde el panel de administración.
 */
export async function seedSettings(dataSource: DataSource): Promise<void> {
  const settingRepo = dataSource.getRepository(Setting);

  const settings: Partial<Setting>[] = [
    // ═══════════════════════════════════════════════════════════════
    // Owner Info (genérico)
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'owner_name',
      value: 'Nombre Apellido',
      type: 'string',
      category: 'owner',
      description: 'Nombre completo del dueño del portfolio',
    },
    {
      key: 'owner_first_name',
      value: 'Nombre',
      type: 'string',
      category: 'owner',
      description: 'Nombre del dueño',
    },
    {
      key: 'owner_last_name',
      value: 'Apellido',
      type: 'string',
      category: 'owner',
      description: 'Apellido del dueño',
    },
    {
      key: 'owner_role',
      value: 'Tu Rol Profesional',
      type: 'string',
      category: 'owner',
      description: 'Rol profesional principal',
    },
    {
      key: 'owner_role_short',
      value: 'Developer',
      type: 'string',
      category: 'owner',
      description: 'Rol profesional corto (para placeholders)',
    },
    {
      key: 'owner_location',
      value: 'Tu Ciudad, Tu País',
      type: 'string',
      category: 'owner',
      description: 'Ubicación geográfica',
    },
    {
      key: 'owner_philosophy',
      value: 'Tu filosofía profesional.',
      type: 'string',
      category: 'owner',
      description: 'Filosofía profesional',
    },
    {
      key: 'owner_bio',
      value: JSON.stringify({
        short: 'Describe tu perfil profesional en una línea.',
        long: 'Detalla aquí tu experiencia, metodología y lo que te hace único. Este es el espacio para tu biografía profesional completa.',
      }),
      type: 'json',
      category: 'owner',
      description: 'Biografía corta y larga',
    },

    // ═══════════════════════════════════════════════════════════════
    // Contact Info (vacío)
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'contact_email_primary',
      value: 'tu@email.com',
      type: 'string',
      category: 'contact',
      description: 'Email principal de contacto',
    },
    {
      key: 'owner_email',
      value: 'tu@email.com',
      type: 'string',
      category: 'contact',
      description: 'Email para placeholders {{owner_email}}',
    },
    {
      key: 'contact_availability',
      value: 'Disponible para nuevos proyectos.',
      type: 'string',
      category: 'contact',
      description: 'Estado de disponibilidad',
    },
    {
      key: 'contact_cta',
      value: 'Si mi perfil te interesa, no dudes en contactarme.',
      type: 'string',
      category: 'contact',
      description: 'Call to action para contacto',
    },

    // ═══════════════════════════════════════════════════════════════
    // Social Links (vacío)
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'social_github',
      value: '',
      type: 'string',
      category: 'social',
      description: 'URL de GitHub',
    },
    {
      key: 'github_username',
      value: '',
      type: 'string',
      category: 'social',
      description: 'Username de GitHub',
    },
    {
      key: 'social_linkedin',
      value: '',
      type: 'string',
      category: 'social',
      description: 'URL de LinkedIn',
    },
    {
      key: 'social_website',
      value: '',
      type: 'string',
      category: 'social',
      description: 'URL del sitio web personal o de empresa',
    },

    // ═══════════════════════════════════════════════════════════════
    // Branding (genérico)
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
      value: 'C:\\>',
      type: 'string',
      category: 'branding',
      description: 'Prompt de la terminal',
    },

    // ═══════════════════════════════════════════════════════════════
    // Tech Stack (vacío)
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'tech_stack',
      value: JSON.stringify({
        backend: [],
        frontend: [],
        databases: [],
        devops: [],
        integrations: [],
      }),
      type: 'json',
      category: 'tech',
      description: 'Stack tecnológico completo',
    },

    // ═══════════════════════════════════════════════════════════════
    // AI Configuration (genérico)
    // ═══════════════════════════════════════════════════════════════
    {
      key: 'ai_name',
      value: 'Asistente IA',
      type: 'string',
      category: 'ai',
      description: 'Nombre del asistente IA',
    },
    {
      key: 'ai_command',
      value: 'ask',
      type: 'string',
      category: 'ai',
      description: 'Comando para invocar al asistente en la terminal',
    },
    {
      key: 'ai_greeting',
      value:
        '¡Hola! Soy el asistente IA de este portfolio. Pregúntame sobre proyectos, experiencia o arquitectura.',
      type: 'string',
      category: 'ai',
      description: 'Mensaje de bienvenida del asistente',
    },
  ];

  for (const setting of settings) {
    // Usar findOne para verificar por `key` y `userId`
    const exists = await settingRepo.findOne({ where: { key: setting.key, userId: 1 } });
    if (!exists) {
      // Crear solo si no existe para el usuario admin (userId: 1)
      await settingRepo.save({ ...setting, userId: 1 });
      console.log(`  ✓ Setting creado: ${setting.key}`);
    } else {
      console.log(`  ⏭️ Setting ya existe: ${setting.key}`);
    }
  }
}
