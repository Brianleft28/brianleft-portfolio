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
   * Obtiene un setting por key
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    return setting?.value || null;
  }

  /**
   * Actualiza un setting
   */
  async updateSetting(key: string, value: string): Promise<void> {
    await this.settingsRepository.update({ key }, { value });
  }

  /**
   * Guarda el CV y actualiza el setting
   */
  async saveCv(file: Express.Multer.File): Promise<{ filename: string; path: string }> {
    // Crear directorio si no existe
    if (!existsSync(this.uploadsDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(this.uploadsDir, { recursive: true });
    }

    // Eliminar CV anterior si existe
    const currentCv = await this.getSetting('cv_filename');
    if (currentCv) {
      const oldPath = join(this.uploadsDir, currentCv);
      if (existsSync(oldPath)) {
        unlinkSync(oldPath);
      }
    }

    // Guardar nuevo CV
    const newFilename = `cv-${Date.now()}.pdf`;
    const newPath = join(this.uploadsDir, newFilename);
    
    const { writeFileSync } = await import('fs');
    writeFileSync(newPath, file.buffer);

    // Actualizar setting con nuevo nombre
    await this.updateSetting('cv_filename', newFilename);

    return {
      filename: newFilename,
      path: `/uploads/cv`,
    };
  }

  /**
   * Obtiene la ruta del CV actual
   */
  async getCvPath(): Promise<{ path: string; displayName: string }> {
    const filename = await this.getSetting('cv_filename');
    const displayName = await this.getSetting('cv_display_name');

    if (!filename) {
      throw new NotFoundException('No hay CV cargado');
    }

    const fullPath = join(this.uploadsDir, filename);
    if (!existsSync(fullPath)) {
      throw new NotFoundException('Archivo CV no encontrado');
    }

    return {
      path: fullPath,
      displayName: displayName || 'curriculum-vitae.pdf',
    };
  }

  /**
   * Verifica si existe un CV cargado
   */
  async hasCv(): Promise<boolean> {
    const filename = await this.getSetting('cv_filename');
    if (!filename) return false;

    const fullPath = join(this.uploadsDir, filename);
    return existsSync(fullPath);
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
