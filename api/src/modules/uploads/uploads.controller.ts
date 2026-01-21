import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Res,
  UseGuards,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // ═══════════════════════════════════════════════════════════════
  // IMÁGENES (avatar, proyectos, etc.)
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /uploads/images/:type - Subir imagen (requiere auth)
   * type: 'avatar' | 'project' | 'logo'
   */
  @Post('images/:type')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('type') type: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const validTypes = ['avatar', 'project', 'logo', 'background'];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Tipo de imagen inválido. Permitidos: ${validTypes.join(', ')}`);
    }

    const result = await this.uploadsService.saveImage(file, type);
    return {
      success: true,
      message: 'Imagen subida correctamente',
      ...result,
    };
  }

  /**
   * GET /uploads/images/:type - Obtener imagen (público)
   */
  @Get('images/:type')
  async getImage(@Param('type') type: string, @Res() res: Response) {
    try {
      const { path, mimeType } = await this.uploadsService.getImagePath(type);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
      return res.sendFile(path, { root: '.' });
    } catch {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'Imagen no disponible',
      });
    }
  }

  /**
   * GET /uploads/images/:type/info - Info de imagen (público)
   */
  @Get('images/:type/info')
  async getImageInfo(@Param('type') type: string) {
    const hasImage = await this.uploadsService.hasImage(type);
    
    if (!hasImage) {
      return {
        available: false,
        type,
        message: 'No hay imagen cargada',
      };
    }

    const filename = await this.uploadsService.getSetting(`${type}_image`);
    
    return {
      available: true,
      type,
      filename,
      url: `/uploads/images/${type}`,
    };
  }

  /**
   * DELETE /uploads/images/:type - Eliminar imagen (requiere auth)
   */
  @Delete('images/:type')
  @UseGuards(JwtAuthGuard)
  async deleteImage(@Param('type') type: string) {
    await this.uploadsService.deleteImage(type);
    return {
      success: true,
      message: 'Imagen eliminada',
    };
  }

  /**
   * GET /uploads/images - Listar todas las imágenes (público)
   */
  @Get('images')
  async listImages() {
    const types = ['avatar', 'project', 'logo', 'background'];
    const images = [];

    for (const type of types) {
      const hasImage = await this.uploadsService.hasImage(type);
      if (hasImage) {
        const filename = await this.uploadsService.getSetting(`${type}_image`);
        images.push({
          type,
          filename,
          url: `/uploads/images/${type}`,
        });
      }
    }

    return { images };
  }

  /**
   * POST /uploads/cv - Subir CV (requiere auth)
   */
  @Post('cv')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadsService.saveCv(file);
    return {
      success: true,
      message: 'CV subido correctamente',
      ...result,
    };
  }

  /**
   * GET /uploads/cv - Descargar CV (público)
   */
  @Get('cv')
  async downloadCv(@Res() res: Response) {
    try {
      const { path, displayName } = await this.uploadsService.getCvPath();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${displayName}"`);

      return res.sendFile(path, { root: '.' });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: 'CV no disponible',
      });
    }
  }

  /**
   * GET /uploads/cv/info - Info del CV (público)
   */
  @Get('cv/info')
  async getCvInfo() {
    const hasCv = await this.uploadsService.hasCv();
    
    if (!hasCv) {
      return {
        available: false,
        message: 'No hay CV cargado',
      };
    }

    const displayName = await this.uploadsService.getSetting('cv_display_name');
    
    return {
      available: true,
      displayName: displayName || 'curriculum-vitae.pdf',
      downloadUrl: '/uploads/cv',
    };
  }
}
