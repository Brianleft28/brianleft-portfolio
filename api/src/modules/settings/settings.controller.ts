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
import { UserId } from '../../decorators';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings - Lista todos los settings (requiere auth)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('category') category?: string, @UserId() userId?: number) {
    const targetUserId = userId || 1;
    if (category) {
      return this.settingsService.findByCategory(category, targetUserId);
    }
    return this.settingsService.findAll(targetUserId);
  }

  /**
   * GET /settings/public - Settings públicos (sin auth)
   * Devuelve todos los settings necesarios para el frontend
   */
  @Get('public')
  async findPublic(@Query('userId') userId?: number) {
    const publicCategories = ['branding', 'social', 'owner', 'ai', 'contact'];
    const settings = await this.settingsService.findAll(userId || 1);

    return settings.filter((s) => s.category && publicCategories.includes(s.category));
  }

  /**
   * GET /settings/banner - Obtiene el ASCII banner (público)
   * Si el banner actual no coincide con owner_name, lo regenera automáticamente
   */
  @Get('banner')
  async getBanner(@Query('userId') userId?: number) {
    const targetUserId = userId || 1;
    // Obtener el nombre actual y el banner
    const ownerName = await this.settingsService.getValue('owner_name', targetUserId);
    const currentBanner = await this.settingsService.getValue('ascii_banner', targetUserId);

    // Si el banner no contiene el nombre actual (ignorando mayúsculas y caracteres especiales)
    // regenerarlo automáticamente
    const nameParts = (ownerName || 'Portfolio').toLowerCase().split(' ');
    const bannerLower = (currentBanner || '').toLowerCase();
    const needsRegeneration = nameParts.some(
      (part) => part.length > 2 && !bannerLower.includes(part),
    );

    if (needsRegeneration || !currentBanner) {
      const banner = await this.settingsService.regenerateAsciiBanner(targetUserId);
      return { ascii_banner: banner };
    }

    return { ascii_banner: currentBanner };
  }

  /**
   * POST /settings/banner/regenerate - Regenera el ASCII banner
   */
  @Post('banner/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateBanner(@UserId() userId: number) {
    const banner = await this.settingsService.regenerateAsciiBanner(userId);
    return { ascii_banner: banner, message: 'Banner regenerado exitosamente' };
  }

  /**
   * POST /settings/banner/preview - Preview de un texto como ASCII
   * Nota: La autenticación se maneja en el proxy de SvelteKit (session-based)
   */
  @Post('banner/preview')
  async previewBanner(@Body('text') text: string, @Body('font') font?: string) {
    const banner = await this.settingsService.generateAsciiBanner(text, font);
    return { ascii_banner: banner };
  }

  /**
   * GET /settings/:key - Obtiene un setting por key
   */
  @Get('key/:key')
  @UseGuards(JwtAuthGuard)
  async findByKey(@Param('key') key: string, @UserId() userId: number) {
    return this.settingsService.findByKey(key, userId);
  }

  /**
   * PATCH /settings/:id - Actualiza un setting
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body('value') value: string,
    @UserId() userId: number,
  ) {
    return this.settingsService.update(id, value, userId);
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
    @UserId() userId: number,
  ) {
    return this.settingsService.create(body, userId);
  }

  /**
   * DELETE /settings/:id - Elimina un setting
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    await this.settingsService.delete(id, userId);
    return { success: true, message: 'Setting eliminado' };
  }
}
