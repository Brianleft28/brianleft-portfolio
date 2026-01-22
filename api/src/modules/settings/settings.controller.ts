import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings - Lista todos los settings (requiere auth)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('category') category?: string) {
    if (category) {
      return this.settingsService.findByCategory(category);
    }
    return this.settingsService.findAll();
  }

  /**
   * GET /settings/public - Settings públicos (sin auth)
   * Devuelve todos los settings necesarios para el frontend
   */
  @Get('public')
  async findPublic() {
    const publicCategories = ['branding', 'social', 'owner', 'ai', 'contact'];
    const settings = await this.settingsService.findAll();

    return settings.filter((s) => s.category && publicCategories.includes(s.category));
  }

  /**
   * GET /settings/banner - Obtiene el ASCII banner (público)
   * Si el banner actual no coincide con owner_name, lo regenera automáticamente
   */
  @Get('banner')
  async getBanner() {
    // Obtener el nombre actual y el banner
    const ownerName = await this.settingsService.getValue('owner_name');
    const currentBanner = await this.settingsService.getValue('ascii_banner');

    // Si el banner no contiene el nombre actual (ignorando mayúsculas y caracteres especiales)
    // regenerarlo automáticamente
    const nameParts = (ownerName || 'Portfolio').toLowerCase().split(' ');
    const bannerLower = (currentBanner || '').toLowerCase();
    const needsRegeneration = nameParts.some(
      (part) => part.length > 2 && !bannerLower.includes(part),
    );

    if (needsRegeneration || !currentBanner) {
      const banner = await this.settingsService.regenerateAsciiBanner();
      return { ascii_banner: banner };
    }

    return { ascii_banner: currentBanner };
  }

  /**
   * POST /settings/banner/regenerate - Regenera el ASCII banner
   */
  @Post('banner/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateBanner() {
    const banner = await this.settingsService.regenerateAsciiBanner();
    return { ascii_banner: banner, message: 'Banner regenerado exitosamente' };
  }

  /**
   * POST /settings/banner/preview - Preview de un texto como ASCII
   */
  @Post('banner/preview')
  @UseGuards(JwtAuthGuard)
  async previewBanner(@Body('text') text: string, @Body('font') font?: string) {
    const banner = await this.settingsService.generateAsciiBanner(text, font);
    return { ascii_banner: banner };
  }

  /**
   * GET /settings/:key - Obtiene un setting por key
   */
  @Get('key/:key')
  @UseGuards(JwtAuthGuard)
  async findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  /**
   * PATCH /settings/:id - Actualiza un setting
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body('value') value: string) {
    return this.settingsService.update(id, value);
  }

  /**
   * POST /settings - Crea un nuevo setting
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    body: {
      key: string;
      value: string;
      type?: 'string' | 'number' | 'boolean' | 'json';
      category?: string;
      description?: string;
    },
  ) {
    return this.settingsService.create(body);
  }

  /**
   * DELETE /settings/:id - Elimina un setting
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.settingsService.delete(id);
    return { success: true, message: 'Setting eliminado' };
  }
}
