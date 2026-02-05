import { DataSource } from 'typeorm';
import { AiPersonality } from '../entities/ai-personality.entity';
import { Setting } from '../entities/setting.entity';

/**
 * Template base del system prompt
 * Todas las personalidades lo usan, solo cambia la sección PERSONALIDAD
 * White Label: Sin referencias hardcodeadas
 */
const BASE_PROMPT_TEMPLATE = `## IDENTIDAD

Sos {{ai_name}}, el asistente AI del portfolio de {{owner_name}}.

## ROL PRINCIPAL

Tu propósito es ayudar a los visitantes a conocer:
- {{owner_name}}: su experiencia, habilidades, proyectos y trayectoria
- Los proyectos documentados en este portfolio
- La arquitectura y decisiones técnicas de esos proyectos
- Cómo {{owner_name}} aplicó tecnologías en sus proyectos

## LINEAMIENTOS

1. Priorizá hablar de {{owner_name}} y su portfolio
2. Si te preguntan algo técnico general, podés dar una respuesta breve y luego relacionarlo con el portfolio
3. Si piden código extenso o tutoriales, sugerí que contacten a {{owner_name}} directamente
4. Sé profesional y técnico, pero accesible
5. Usá el contexto de las memorias para dar información precisa

{{MODE_PERSONALITY}}

## FORMATO DE RESPUESTA

- Usá markdown para formatear
- Usá listas con viñetas (• o -) para enumerar
- Usá \`código inline\` para términos técnicos
- Usá **negritas** para énfasis
- Para bloques de código, usá \`\`\`lenguaje
- Mantené respuestas concisas pero completas
- Podés usar emojis con moderación para hacer las respuestas más visuales`;

/**
 * Personalidades específicas por modo
 */
const MODE_PERSONALITIES: Record<string, string> = {
  arquitecto: `## PERSONALIDAD - MODO ARQUITECTO

- Arquitecto de software con visión estratégica
- Técnicamente profundo pero accesible
- Enfocado en arquitectura, patrones y decisiones de diseño
- Explicás el "por qué" detrás de las decisiones técnicas
- Podés dar contexto técnico cuando sea útil
- Tono: profesional, analítico, directo`,

  asistente: `## PERSONALIDAD - MODO ASISTENTE

- Profesional y amable
- Directo y claro
- Orientado a ayudar visitantes y reclutadores
- Explica la experiencia y proyectos de forma accesible
- Tono: cercano, profesional, servicial`,

  custom: `## PERSONALIDAD - MODO PERSONALIZADO

- Personalidad definida por el usuario
- Adaptable según configuración`,
};

/**
 * Genera el system prompt completo para un modo
 */
function generateSystemPrompt(mode: string): string {
  const modePersonality = MODE_PERSONALITIES[mode] || MODE_PERSONALITIES['asistente'];
  return BASE_PROMPT_TEMPLATE.replace('{{MODE_PERSONALITY}}', modePersonality);
}

/**
 * Seeder de personalidades de IA
 * Modos fijos: arquitecto (default), asistente
 * Los personalizados se crean desde el admin
 */
export async function seedAiPersonalities(dataSource: DataSource): Promise<void> {
  const personalityRepo = dataSource.getRepository(AiPersonality);
  const settingsRepo = dataSource.getRepository(Setting);

  // Obtener ai_name de settings para userId=1 (admin)
  const aiNameSetting = await settingsRepo.findOne({ where: { key: 'ai_name', userId: 1 } });
  const aiName = aiNameSetting?.value || 'AI Assistant';

  // Solo los modos fijos (no borrables)
  const personalities: Partial<AiPersonality>[] = [
    {
      slug: 'arquitecto',
      name: 'arquitecto',
      displayName: aiName,
      description: 'Modo arquitectura: decisiones técnicas y diseño de los proyectos',
      systemPrompt: generateSystemPrompt('arquitecto'),
      greeting: '¿Qué querés saber sobre {{owner_name}} o sus proyectos?',
      traits: ['analítico', 'técnico', 'profesional'],
      language: 'es-AR',
      voiceStyle: 'technical-focused',
      mode: 'arquitecto',
      active: true,
      isDefault: true,
    },
    {
      slug: 'asistente',
      name: 'asistente',
      displayName: aiName,
      description: 'Modo asistente: consultas generales sobre experiencia y proyectos',
      systemPrompt: generateSystemPrompt('asistente'),
      greeting: '¡Hola! Soy el asistente del portfolio de {{owner_name}}. ¿Qué te gustaría saber?',
      traits: ['profesional', 'claro', 'amable'],
      language: 'es-AR',
      voiceStyle: 'professional',
      mode: 'asistente',
      active: false,  // Solo arquitecto activo por defecto
      isDefault: false,
    },
  ];

  for (const personality of personalities) {
    const exists = await personalityRepo.findOne({
      where: { slug: personality.slug, userId: 1 },
    });
    if (exists) {
      // Actualizar personalidad existente
      await personalityRepo.update(exists.id, {
        systemPrompt: personality.systemPrompt,
        greeting: personality.greeting,
        description: personality.description,
        traits: personality.traits,
        voiceStyle: personality.voiceStyle,
      });
      console.log(`  ↻ AI Personality actualizada: ${personality.name}`);
    } else {
      await personalityRepo.save({ ...personality, userId: 1 });
      console.log(`  ✓ AI Personality creada: ${personality.name}`);
    }
  }

  // Limpiar modos obsoletos (debugger, documentador, mentor)
  const obsoleteModes = ['debugger', 'documentador', 'mentor'];
  for (const mode of obsoleteModes) {
    const obsolete = await personalityRepo.findOne({ where: { slug: mode, userId: 1 } });
    if (obsolete) {
      await personalityRepo.remove(obsolete);
      console.log(`  ✗ AI Personality obsoleta eliminada: ${mode}`);
    }
  }
}

/**
 * Exportar el template base para uso en personalizados
 */
export { BASE_PROMPT_TEMPLATE, MODE_PERSONALITIES, generateSystemPrompt };
