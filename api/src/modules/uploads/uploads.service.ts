import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../entities/setting.entity';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  private readonly uploadsDir = './uploads';

  constructor(
    @InjectRepository(Setting)
    private settingsRepository: Repository<Setting>,
  ) {}

  /**
   * Obtiene un setting por key y userId
   */
  async getSetting(key: string, userId?: number): Promise<string | null> {
    const where: any = { key };
    if (userId) {
      where.userId = userId;
    }
    const setting = await this.settingsRepository.findOne({ where });
    return setting?.value || null;
  }

  /**
   * Actualiza un setting por userId
   */
  async updateSetting(key: string, value: string, userId?: number): Promise<void> {
    const where: any = { key };
    if (userId) {
      where.userId = userId;
    }
    await this.settingsRepository.update(where, { value });
  }

  /**
   * Crea o actualiza un setting para un usuario
   */
  async upsertSetting(key: string, value: string, userId: number, category?: string, description?: string): Promise<void> {
    const existing = await this.settingsRepository.findOne({ 
      where: { key, userId } 
    });
    
    if (existing) {
      await this.settingsRepository.update({ key, userId }, { value });
    } else {
      await this.settingsRepository.save({
        key,
        value,
        userId,
        type: 'string',
        category: category || 'files',
        description: description || null,
      });
    }
  }

  /**
   * Guarda el CV y actualiza el setting (por usuario)
   */
  async saveCv(file: Express.Multer.File, userId: number): Promise<{ filename: string; path: string }> {
    // Crear directorio por usuario si no existe
    const userDir = join(this.uploadsDir, `user-${userId}`);
    if (!existsSync(userDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(userDir, { recursive: true });
    }

    // Eliminar CV anterior si existe
    const currentCv = await this.getSetting('cv_filename', userId);
    if (currentCv) {
      const oldPath = join(userDir, currentCv);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    // Guardar nuevo CV
    const newFilename = `cv-${Date.now()}.pdf`;
    const newPath = join(userDir, newFilename);
    
    const { writeFileSync } = await import('fs');
    writeFileSync(newPath, file.buffer);

    // Actualizar setting con nuevo nombre
    await this.upsertSetting('cv_filename', newFilename, userId, 'files', 'Nombre del archivo CV');

    return {
      filename: newFilename,
      path: `/uploads/cv`,
    };
  }

  /**
   * Obtiene la ruta del CV de un usuario
   */
  async getCvPath(userId?: number): Promise<{ path: string; displayName: string }> {
    // Buscar CV del usuario específico o el primero que exista
    let filename: string | null = null;
    let displayName: string | null = null;
    let targetUserId = userId;

    if (userId) {
      filename = await this.getSetting('cv_filename', userId);
      displayName = await this.getSetting('cv_display_name', userId);
    }

    // Si no hay userId o no tiene CV, buscar el primero disponible
    if (!filename) {
      const setting = await this.settingsRepository.findOne({ 
        where: { key: 'cv_filename' },
        order: { userId: 'ASC' }
      });
      if (setting) {
        filename = setting.value;
        targetUserId = setting.userId;
        const displaySetting = await this.settingsRepository.findOne({
          where: { key: 'cv_display_name', userId: setting.userId }
        });
        displayName = displaySetting?.value || null;
      }
    }

    if (!filename || !targetUserId) {
      throw new NotFoundException('No hay CV cargado');
    }

    const fullPath = join(this.uploadsDir, `user-${targetUserId}`, filename);
    if (!existsSync(fullPath)) {
      // Fallback: buscar en directorio antiguo sin userId
      const oldPath = join(this.uploadsDir, filename);
      if (existsSync(oldPath)) {
        return {
          path: oldPath,
          displayName: displayName || 'curriculum-vitae.pdf',
        };
      }
      throw new NotFoundException('Archivo CV no encontrado');
    }

    return {
      path: fullPath,
      displayName: displayName || 'curriculum-vitae.pdf',
    };
  }

  /**
   * Verifica si existe un CV cargado para un usuario
   */
  async hasCv(userId?: number): Promise<boolean> {
    if (userId) {
      const filename = await this.getSetting('cv_filename', userId);
      if (!filename) return false;

      const fullPath = join(this.uploadsDir, `user-${userId}`, filename);
      if (existsSync(fullPath)) return true;
    }

    // Verificar CV en directorio global (legacy)
    const globalSetting = await this.settingsRepository.findOne({ 
      where: { key: 'cv_filename' }
    });
    if (globalSetting?.value) {
      const fullPath = join(this.uploadsDir, globalSetting.value);
      if (existsSync(fullPath)) return true;
      
      const userPath = join(this.uploadsDir, `user-${globalSetting.userId}`, globalSetting.value);
      if (existsSync(userPath)) return true;
    }
    
    return false;
  }

  // ═══════════════════════════════════════════════════════════════
  // IMÁGENES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Guarda una imagen y actualiza el setting correspondiente
   */
  async saveImage(file: Express.Multer.File, type: string): Promise<{ filename: string; url: string }> {
    const settingKey = `${type}_image`;
    const imagesDir = join(this.uploadsDir, 'images');
    
    // Crear directorio si no existe
    if (!existsSync(imagesDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(imagesDir, { recursive: true });
    }

    // Eliminar imagen anterior si existe
    const currentImage = await this.getSetting(settingKey);
    if (currentImage) {
      const oldPath = join(imagesDir, currentImage);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    // Guardar nueva imagen con nombre basado en tipo
    const ext = file.originalname.split('.').pop();
    const newFilename = `${type}-${Date.now()}.${ext}`;
    const newPath = join(imagesDir, newFilename);
    
    const { writeFileSync } = await import('fs');
    writeFileSync(newPath, file.buffer);

    // Actualizar o crear setting
    const existing = await this.settingsRepository.findOne({ where: { key: settingKey } });
    if (existing) {
      await this.settingsRepository.update({ key: settingKey }, { value: newFilename });
    } else {
      await this.settingsRepository.save({
        key: settingKey,
        value: newFilename,
        type: 'string',
        category: 'files',
        description: `Imagen de tipo ${type}`,
      });
    }

    return {
      filename: newFilename,
      url: `/uploads/images/${type}`,
    };
  }

  /**
   * Obtiene la ruta de una imagen
   */
  async getImagePath(type: string): Promise<{ path: string; mimeType: string }> {
    const filename = await this.getSetting(`${type}_image`);

    if (!filename) {
      throw new NotFoundException(`No hay imagen de tipo ${type}`);
    }

    const fullPath = join(this.uploadsDir, 'images', filename);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Archivo de imagen no encontrado');
    }

    // Detectar mime type
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return {
      path: fullPath,
      mimeType: mimeTypes[ext || ''] || 'application/octet-stream',
    };
  }

  /**
   * Verifica si existe una imagen
   */
  async hasImage(type: string): Promise<boolean> {
    const filename = await this.getSetting(`${type}_image`);
    if (!filename) return false;

    const fullPath = join(this.uploadsDir, 'images', filename);
    return existsSync(fullPath);
  }

  /**
   * Elimina una imagen
   */
  async deleteImage(type: string): Promise<void> {
    const filename = await this.getSetting(`${type}_image`);
    
    if (filename) {
      const fullPath = join(this.uploadsDir, 'images', filename);
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
      await this.settingsRepository.update({ key: `${type}_image` }, { value: '' });
    }
  }
}
