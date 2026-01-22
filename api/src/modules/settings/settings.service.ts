import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../entities/setting.entity';
import * as figlet from 'figlet';

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
    const savedSetting = await this.settingsRepository.save(setting);

    // Si es un campo relacionado con nombre o rol, regenerar ASCII banner
    const bannerTriggerKeys = ['owner_name', 'owner_first_name', 'owner_last_name', 'owner_role'];
    if (bannerTriggerKeys.includes(setting.key)) {
      // Si se actualizó first_name o last_name, actualizar también owner_name
      if (setting.key === 'owner_first_name' || setting.key === 'owner_last_name') {
        const firstName =
          setting.key === 'owner_first_name'
            ? value
            : (await this.getValue('owner_first_name')) || '';
        const lastName =
          setting.key === 'owner_last_name'
            ? value
            : (await this.getValue('owner_last_name')) || '';
        const fullName = `${firstName} ${lastName}`.trim();
        await this.updateByKey('owner_name', fullName);
      }
      await this.regenerateAsciiBanner();
    }

    return savedSetting;
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
    const savedSetting = await this.settingsRepository.save(setting);

    // Si es un campo relacionado con nombre o rol, regenerar ASCII banner
    const bannerTriggerKeys = ['owner_name', 'owner_first_name', 'owner_last_name', 'owner_role'];
    if (bannerTriggerKeys.includes(key)) {
      await this.regenerateAsciiBanner();
    }

    return savedSetting;
  }

  /**
   * Genera ASCII art banner con figlet
   */
  async generateAsciiBanner(text: string, font: string = 'Standard'): Promise<string> {
    return new Promise((resolve) => {
      figlet.text(text, { font: font as any, width: 80 }, (err, result) => {
        if (err || !result) {
          // Fallback simple
          const border = '═'.repeat(text.length + 4);
          resolve(`╔${border}╗\n║  ${text.toUpperCase()}  ║\n╚${border}╝`);
          return;
        }
        resolve(result);
      });
    });
  }

  /**
   * Regenera el ASCII banner basado en owner_name y owner_role
   */
  async regenerateAsciiBanner(): Promise<string> {
    const ownerName = (await this.getValue('owner_name')) || 'Portfolio';
    const ownerRole = (await this.getValue('owner_role')) || 'Developer';

    const nameBanner = await this.generateAsciiBanner(ownerName);
    const fullBanner = `${nameBanner}\n                  ${ownerRole}`;

    // Guardar o actualizar el banner
    let bannerSetting = await this.findByKey('ascii_banner');
    if (bannerSetting) {
      bannerSetting.value = fullBanner;
      await this.settingsRepository.save(bannerSetting);
    } else {
      await this.create({
        key: 'ascii_banner',
        value: fullBanner,
        type: 'string',
        category: 'branding',
        description: 'Banner ASCII generado automáticamente',
      });
    }

    return fullBanner;
  }

  /**
   * Obtiene el ASCII banner actual
   */
  async getAsciiBanner(): Promise<string> {
    const banner = await this.getValue('ascii_banner');
    if (banner) return banner;

    // Generar uno por defecto si no existe
    return this.regenerateAsciiBanner();
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
