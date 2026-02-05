import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Or } from 'typeorm';
import { AiPersonality } from '../../entities/ai-personality.entity';

@Injectable()
export class AiPersonalitiesService {
  constructor(
    @InjectRepository(AiPersonality)
    private aiPersonalityRepository: Repository<AiPersonality>,
  ) {}

  /**
   * Obtiene la personalidad activa (default) para un usuario
   * Busca primero una personalidad del usuario, luego una global
   */
  async findActive(userId: number): Promise<AiPersonality | null> {
    // Primero buscar personalidad default del usuario
    let personality = await this.aiPersonalityRepository.findOne({
      where: { active: true, isDefault: true, userId },
    });

    // Si no tiene, buscar personalidad global default
    if (!personality) {
      personality = await this.aiPersonalityRepository.findOne({
        where: { active: true, isDefault: true, userId: IsNull() },
      });
    }

    return personality;
  }

  /**
   * Obtiene todas las personalidades disponibles para un usuario
   * Incluye las globales (userId null) y las propias del usuario
   */
  async findAll(userId: number): Promise<AiPersonality[]> {
    return this.aiPersonalityRepository.find({
      where: [
        { userId },
        { userId: IsNull() }, // Personalidades globales
      ],
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Obtiene una personalidad por ID (verificando acceso)
   */
  async findById(id: number, userId?: number): Promise<AiPersonality | null> {
    if (userId) {
      // Buscar que sea del usuario o global
      return this.aiPersonalityRepository.findOne({ 
        where: [
          { id, userId },
          { id, userId: IsNull() },
        ],
      });
    }
    return this.aiPersonalityRepository.findOne({ where: { id } });
  }

  /**
   * Obtiene una personalidad por slug (verificando acceso)
   */
  async findBySlug(slug: string, userId: number): Promise<AiPersonality | null> {
    // Buscar primero del usuario, luego global
    let personality = await this.aiPersonalityRepository.findOne({ 
      where: { slug, userId } 
    });
    
    if (!personality) {
      personality = await this.aiPersonalityRepository.findOne({ 
        where: { slug, userId: IsNull() } 
      });
    }
    
    return personality;
  }

  /**
   * Obtiene una personalidad por modo (arquitecto, asistente) para un usuario
   */
  async findByMode(mode: string, userId: number): Promise<AiPersonality | null> {
    // Buscar primero del usuario
    let personality = await this.aiPersonalityRepository.findOne({
      where: { mode, active: true, userId },
    });

    // Si no existe, buscar global
    if (!personality) {
      personality = await this.aiPersonalityRepository.findOne({
        where: { mode, active: true, userId: IsNull() },
      });
    }

    return personality;
  }

  /**
   * Actualiza la personalidad activa del usuario
   */
  async updateActive(data: Partial<AiPersonality>, userId: number): Promise<AiPersonality> {
    let personality = await this.findActive(userId);

    if (!personality) {
      // Crear una nueva para el usuario si no existe
      personality = this.aiPersonalityRepository.create({
        slug: data.name?.toLowerCase().replace(/\s+/g, '-') || 'default',
        name: data.name || 'default',
        displayName: data.displayName || 'AI Assistant',
        description: data.description || '',
        systemPrompt: data.systemPrompt || '',
        greeting: data.greeting || null,
        traits: data.traits || null,
        language: data.language || 'es-AR',
        voiceStyle: data.voiceStyle || 'technical',
        active: true,
        isDefault: true,
        userId,
      });
      return this.aiPersonalityRepository.save(personality);
    }

    // Si es una personalidad global, crear una copia para el usuario
    if (personality.userId === null) {
      const userPersonality = this.aiPersonalityRepository.create({
        ...personality,
        id: undefined, // Forzar nuevo ID
        ...data,
        userId,
      });
      return this.aiPersonalityRepository.save(userPersonality);
    }

    // Actualizar existente
    Object.assign(personality, data);
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Crea una nueva personalidad para un usuario
   */
  async create(data: Partial<AiPersonality>, userId: number): Promise<AiPersonality> {
    const personality = this.aiPersonalityRepository.create({
      slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, '-') || 'custom',
      name: data.name || 'custom',
      displayName: data.displayName || 'Custom AI',
      description: data.description || '',
      systemPrompt: data.systemPrompt || '',
      greeting: data.greeting || null,
      traits: data.traits || null,
      language: data.language || 'es-AR',
      voiceStyle: data.voiceStyle || 'technical',
      active: true,
      isDefault: false,
      userId,
    });

    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Actualiza una personalidad por ID (verificando ownership)
   */
  async update(id: number, data: Partial<AiPersonality>, userId: number): Promise<AiPersonality> {
    const personality = await this.aiPersonalityRepository.findOne({
      where: { id, userId }, // Solo puede editar las propias
    });

    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada o no tienes permisos`);
    }

    Object.assign(personality, data);
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Establece una personalidad como default para un usuario
   */
  async setDefault(id: number, userId: number): Promise<AiPersonality> {
    // Quitar default de todas las del usuario
    await this.aiPersonalityRepository.update({ userId }, { isDefault: false });

    // Verificar que la personalidad existe y es accesible
    const personality = await this.findById(id, userId);
    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada`);
    }

    // Si es global, crear una copia para el usuario
    if (personality.userId === null) {
      const userPersonality = this.aiPersonalityRepository.create({
        ...personality,
        id: undefined,
        isDefault: true,
        userId,
      });
      return this.aiPersonalityRepository.save(userPersonality);
    }

    personality.isDefault = true;
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Activa una personalidad (desactiva las demás del usuario)
   */
  async activate(id: number, userId: number): Promise<AiPersonality> {
    // Verificar que la personalidad existe y es accesible
    const personality = await this.findById(id, userId);
    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada`);
    }

    // Desactivar todas las del usuario
    await this.aiPersonalityRepository.update({ userId }, { active: false });

    // Si es global, crear una copia para el usuario
    if (personality.userId === null) {
      const userPersonality = this.aiPersonalityRepository.create({
        ...personality,
        id: undefined,
        active: true,
        userId,
      });
      return this.aiPersonalityRepository.save(userPersonality);
    }

    personality.active = true;
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Elimina una personalidad (solo las propias, no globales)
   */
  async delete(id: number, userId: number): Promise<void> {
    const personality = await this.aiPersonalityRepository.findOne({
      where: { id, userId }, // Solo puede eliminar las propias
    });

    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada o no tienes permisos`);
    }

    if (personality.isDefault) {
      throw new Error('No se puede eliminar la personalidad por defecto');
    }

    await this.aiPersonalityRepository.delete(id);
  }

  /**
   * Inicializa personalidades por defecto para un nuevo usuario
   */
  async initializeForUser(userId: number, ownerName: string): Promise<void> {
    const defaultPersonalities = [
      {
        name: 'Asistente',
        displayName: 'Asistente IA',
        slug: 'asistente',
        mode: 'asistente',
        description: 'Asistente amigable y profesional',
        greeting: '¡Hola! Soy el asistente de este portfolio. ¿En qué puedo ayudarte?',
        traits: ['amigable', 'profesional', 'claro'],
        language: 'es',
        voiceStyle: 'neutral',
        isDefault: true,
        active: true,
        systemPrompt: `IDENTIDAD

Sos el asistente IA del portfolio de {{owner_name}}. Tu rol es responder preguntas sobre {{owner_name}}, sus proyectos y experiencia profesional.

PERSONALIDAD
- Amigable y profesional
- Claro y conciso en las respuestas
- Servicial pero enfocado en el tema

REGLAS
1. Respondé en español
2. SOLO hablás de {{owner_name}} y su portfolio
3. Si preguntan algo fuera de tema, redirigí amablemente hacia los proyectos

INFORMACIÓN DISPONIBLE
- Nombre: {{owner_name}}
- Rol: {{owner_role}}
- Ubicación: {{owner_location}}
- Email: {{owner_email}}
- Disponibilidad: {{contact_availability}}`,
      },
      {
        name: 'Arquitecto',
        displayName: 'Arquitecto de Software',
        slug: 'arquitecto',
        mode: 'arquitecto',
        description: 'Modo técnico y directo para discusiones de arquitectura',
        greeting: 'Modo arquitecto activado. ¿Qué aspecto técnico te interesa?',
        traits: ['técnico', 'directo', 'preciso'],
        language: 'es',
        voiceStyle: 'technical',
        isDefault: false,
        active: true,
        systemPrompt: `IDENTIDAD

Sos el asistente técnico del portfolio de {{owner_name}}. Modo "arquitecto" activado - discusiones técnicas y de diseño de sistemas.

PERSONALIDAD
- Técnico y preciso
- Directo, sin rodeos
- Usa terminología correcta
- Sarcasmo sutil cuando corresponde

REGLAS
1. Respondé en español
2. Enfocate en arquitectura, patrones de diseño y decisiones técnicas
3. Si preguntan código específico, explicá el concepto pero no des tutoriales completos
4. Siempre relacioná con los proyectos de {{owner_name}}

INFORMACIÓN TÉCNICA DISPONIBLE
- Stack principal: Los proyectos de {{owner_name}} usan tecnologías que se describen en cada memoria de proyecto`,
      },
    ];

    for (const personality of defaultPersonalities) {
      const exists = await this.aiPersonalityRepository.findOne({
        where: { slug: personality.slug, userId },
      });

      if (!exists) {
        await this.aiPersonalityRepository.save({
          ...personality,
          userId,
        });
      }
    }
  }
}
