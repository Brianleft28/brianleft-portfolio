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
   * Solo devuelve settings seguros para exponer
   */
  @Get('public')
  async findPublic() {
    const publicCategories = ['branding', 'social'];
    const settings = await this.settingsService.findAll();
    
    return settings.filter(s => s.category && publicCategories.includes(s.category));
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('value') value: string,
  ) {
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
