import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiPersonality } from '../../entities/ai-personality.entity';

@Injectable()
export class AiPersonalitiesService {
  constructor(
    @InjectRepository(AiPersonality)
    private aiPersonalityRepository: Repository<AiPersonality>,
  ) {}

  /**
   * Obtiene la personalidad activa (default)
   */
  async findActive(): Promise<AiPersonality | null> {
    return this.aiPersonalityRepository.findOne({
      where: { active: true, isDefault: true },
    });
  }

  /**
   * Obtiene todas las personalidades
   */
  async findAll(): Promise<AiPersonality[]> {
    return this.aiPersonalityRepository.find({
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Obtiene una personalidad por ID
   */
  async findById(id: number): Promise<AiPersonality | null> {
    return this.aiPersonalityRepository.findOne({ where: { id } });
  }

  /**
   * Obtiene una personalidad por slug
   */
  async findBySlug(slug: string): Promise<AiPersonality | null> {
    return this.aiPersonalityRepository.findOne({ where: { slug } });
  }

  /**
   * Obtiene una personalidad por modo (arquitecto, asistente)
   */
  async findByMode(mode: string): Promise<AiPersonality | null> {
    return this.aiPersonalityRepository.findOne({
      where: { mode, active: true },
    });
  }

  /**
   * Actualiza la personalidad activa
   */
  async updateActive(data: Partial<AiPersonality>): Promise<AiPersonality> {
    let personality = await this.findActive();

    if (!personality) {
      // Crear una nueva si no existe
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
      });
      return this.aiPersonalityRepository.save(personality);
    }

    // Actualizar existente
    Object.assign(personality, data);
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Crea una nueva personalidad
   */
  async create(data: Partial<AiPersonality>): Promise<AiPersonality> {
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
    });

    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Actualiza una personalidad por ID
   */
  async update(id: number, data: Partial<AiPersonality>): Promise<AiPersonality> {
    const personality = await this.findById(id);

    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada`);
    }

    Object.assign(personality, data);
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Establece una personalidad como default
   */
  async setDefault(id: number): Promise<AiPersonality> {
    // Quitar default de todas
    await this.aiPersonalityRepository.update({}, { isDefault: false });

    // Establecer la nueva como default
    const personality = await this.findById(id);
    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada`);
    }

    personality.isDefault = true;
    return this.aiPersonalityRepository.save(personality);
  }

  /**
   * Elimina una personalidad
   */
  async delete(id: number): Promise<void> {
    const personality = await this.findById(id);

    if (!personality) {
      throw new NotFoundException(`Personalidad con ID ${id} no encontrada`);
    }

    if (personality.isDefault) {
      throw new Error('No se puede eliminar la personalidad por defecto');
    }

    await this.aiPersonalityRepository.delete(id);
  }
}
