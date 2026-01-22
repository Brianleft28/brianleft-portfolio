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
   * Obtiene todos los settings de un usuario
   */
  async findAll(userId: number): Promise<Setting[]> {
    return this.settingsRepository.find({
      where: { userId },
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Obtiene settings por categoría de un usuario
   */
  async findByCategory(category: string, userId: number): Promise<Setting[]> {
    return this.settingsRepository.find({
      where: { category, userId },
      order: { key: 'ASC' },
    });
  }

  /**
   * Obtiene un setting por key de un usuario
   */
  async findByKey(key: string, userId: number): Promise<Setting | null> {
    return this.settingsRepository.findOne({ where: { key, userId } });
  }

  /**
   * Obtiene el valor de un setting de un usuario
   */
  async getValue(key: string, userId: number): Promise<string | null> {
    const setting = await this.findByKey(key, userId);
    return setting?.value || null;
  }

  /**
   * Actualiza un setting por ID (verificando ownership)
   */
  async update(id: number, value: string, userId: number): Promise<Setting> {
    const setting = await this.settingsRepository.findOne({ where: { id, userId } });

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
            : (await this.getValue('owner_first_name', userId)) || '';
        const lastName =
          setting.key === 'owner_last_name'
            ? value
            : (await this.getValue('owner_last_name', userId)) || '';
        const fullName = `${firstName} ${lastName}`.trim();
        await this.updateByKey('owner_name', fullName, userId);
      }
      await this.regenerateAsciiBanner(userId);
    }

    return savedSetting;
  }

  /**
   * Actualiza un setting por key de un usuario
   */
  async updateByKey(key: string, value: string, userId: number): Promise<Setting> {
    const setting = await this.findByKey(key, userId);

    if (!setting) {
      throw new NotFoundException(`Setting "${key}" no encontrado`);
    }

    setting.value = value;
    const savedSetting = await this.settingsRepository.save(setting);

    // Si es un campo relacionado con nombre o rol, regenerar ASCII banner
    const bannerTriggerKeys = ['owner_name', 'owner_first_name', 'owner_last_name', 'owner_role'];
    if (bannerTriggerKeys.includes(key)) {
      await this.regenerateAsciiBanner(userId);
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
   * Regenera el ASCII banner basado en owner_name y owner_role de un usuario
   */
  async regenerateAsciiBanner(userId: number): Promise<string> {
    const ownerName = (await this.getValue('owner_name', userId)) || 'Portfolio';
    const ownerRole = (await this.getValue('owner_role', userId)) || 'Developer';

    const nameBanner = await this.generateAsciiBanner(ownerName);
    const fullBanner = `${nameBanner}\n                  ${ownerRole}`;

    // Guardar o actualizar el banner
    let bannerSetting = await this.findByKey('ascii_banner', userId);
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
      }, userId);
    }

    return fullBanner;
  }

  /**
   * Obtiene el ASCII banner actual de un usuario
   */
  async getAsciiBanner(userId: number): Promise<string> {
    const banner = await this.getValue('ascii_banner', userId);
    if (banner) return banner;

    // Generar uno por defecto si no existe
    return this.regenerateAsciiBanner(userId);
  }

  /**
   * Crea un nuevo setting para un usuario
   */
  async create(data: {
    key: string;
    value: string;
    type?: 'string' | 'number' | 'boolean' | 'json';
    category?: string;
    description?: string;
  }, userId: number): Promise<Setting> {
    const setting = new Setting();
    setting.key = data.key;
    setting.value = data.value;
    setting.type = data.type || 'string';
    setting.category = data.category || 'general';
    setting.description = data.description || '';
    setting.userId = userId;

    return this.settingsRepository.save(setting);
  }

  /**
   * Elimina un setting (verificando ownership)
   */
  async delete(id: number, userId: number): Promise<void> {
    const result = await this.settingsRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Setting con ID ${id} no encontrado`);
    }
  }

  /**
   * Obtiene settings como mapa key-value de un usuario
   */
  async getAsMap(userId: number): Promise<Map<string, string>> {
    const settings = await this.findAll(userId);
    const map = new Map<string, string>();

    for (const setting of settings) {
      map.set(setting.key, setting.value);
    }

    return map;
  }

  /**
   * Inicializa settings por defecto para un nuevo usuario
   */
  async initializeForUser(userId: number, data: {
    ownerName: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerRole: string;
    email: string;
  }): Promise<void> {
    // Settings completos para el nuevo usuario
    const defaultSettings: Array<{
      key: string;
      value: string;
      category: string;
      type?: 'string' | 'number' | 'boolean' | 'json';
      description: string;
    }> = [
      // Owner info
      { key: 'owner_name', value: data.ownerName, category: 'owner', type: 'string', description: 'Nombre completo' },
      { key: 'owner_first_name', value: data.ownerFirstName, category: 'owner', type: 'string', description: 'Nombre' },
      { key: 'owner_last_name', value: data.ownerLastName, category: 'owner', type: 'string', description: 'Apellido' },
      { key: 'owner_role', value: data.ownerRole, category: 'owner', type: 'string', description: 'Rol/Título profesional' },
      { key: 'owner_bio', value: JSON.stringify({ short: 'Bienvenido a mi portfolio', long: '' }), category: 'owner', type: 'json', description: 'Biografía corta y larga' },
      // Contact
      { key: 'contact_email', value: data.email, category: 'contact', type: 'string', description: 'Email de contacto' },
      { key: 'contact_location', value: '', category: 'contact', type: 'string', description: 'Ubicación' },
      // Social (vacío por defecto)
      { key: 'social_github', value: '', category: 'social', type: 'string', description: 'URL de GitHub' },
      { key: 'social_linkedin', value: '', category: 'social', type: 'string', description: 'URL de LinkedIn' },
      { key: 'social_twitter', value: '', category: 'social', type: 'string', description: 'URL de Twitter/X' },
      // Branding
      { key: 'branding_theme_color', value: '#00ff00', category: 'branding', type: 'string', description: 'Color principal (hex)' },
      { key: 'branding_terminal_prompt', value: 'C:\\>', category: 'branding', type: 'string', description: 'Prompt de terminal' },
      { key: 'branding_ascii_banner', value: '', category: 'branding', type: 'string', description: 'Banner ASCII (se genera automáticamente)' },
      // AI
      { key: 'ai_personality_name', value: 'TorvaldsAI', category: 'ai', type: 'string', description: 'Nombre del asistente IA' },
      { key: 'ai_personality_style', value: 'técnico y directo', category: 'ai', type: 'string', description: 'Estilo de comunicación' },
    ];

    for (const setting of defaultSettings) {
      await this.create(setting, userId);
    }

    // Generar banner ASCII
    await this.regenerateAsciiBanner(userId);
  }
}
