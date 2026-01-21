import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  /**
   * Obtiene todos los settings
   */
  async findAll(): Promise<Setting[]> {
    return this.settingsRepository.find({
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Obtiene settings por categoría
   */
  async findByCategory(category: string): Promise<Setting[]> {
    return this.settingsRepository.find({
      where: { category },
      order: { key: 'ASC' },
    });
  }

  /**
   * Obtiene un setting por key
   */
  async findByKey(key: string): Promise<Setting | null> {
    return this.settingsRepository.findOne({ where: { key } });
  }

  /**
   * Obtiene el valor de un setting
   */
  async getValue(key: string): Promise<string | null> {
    const setting = await this.findByKey(key);
    return setting?.value || null;
  }

  /**
   * Actualiza un setting por ID
   */
  async update(id: number, value: string): Promise<Setting> {
    const setting = await this.settingsRepository.findOne({ where: { id } });
    
    if (!setting) {
      throw new NotFoundException(`Setting con ID ${id} no encontrado`);
    }

    setting.value = value;
    return this.settingsRepository.save(setting);
  }

  /**
   * Actualiza un setting por key
   */
  async updateByKey(key: string, value: string): Promise<Setting> {
    const setting = await this.findByKey(key);
    
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" no encontrado`);
    }

    setting.value = value;
    return this.settingsRepository.save(setting);
  }

  /**
   * Crea un nuevo setting
   */
  async create(data: {
    key: string;
    value: string;
    type?: 'string' | 'number' | 'boolean' | 'json';
    category?: string;
    description?: string;
  }): Promise<Setting> {
    const setting = new Setting();
    setting.key = data.key;
    setting.value = data.value;
    setting.type = data.type || 'string';
    setting.category = data.category || 'general';
    setting.description = data.description || '';

    return this.settingsRepository.save(setting);
  }

  /**
   * Elimina un setting
   */
  async delete(id: number): Promise<void> {
    const result = await this.settingsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Setting con ID ${id} no encontrado`);
    }
  }

  /**
   * Obtiene settings como mapa key-value
   */
  async getAsMap(): Promise<Map<string, string>> {
    const settings = await this.findAll();
    const map = new Map<string, string>();
    
    for (const setting of settings) {
      map.set(setting.key, setting.value);
    }
    
    return map;
  }
}
