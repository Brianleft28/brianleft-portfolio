import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { Setting } from '../../entities/setting.entity';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting]),
    // Multer configurado dinámicamente en cada endpoint
    // CV usa diskStorage, imágenes usan memoryStorage
    MulterModule.register({
      storage: memoryStorage(), // Default: memoria para imágenes
      fileFilter: (req, file, callback) => {
        // Permitir PDFs e imágenes
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Tipo de archivo no permitido'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
