import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '../../../entities/file.entity';

export class CreateFolderDto {
  @ApiProperty({ example: 'proyectos', description: 'Nombre de la carpeta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la carpeta padre' })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({ example: 0, description: 'Orden de la carpeta' })
  @IsNumber()
  @IsOptional()
  order?: number;
}

export class CreateFileDto {
  @ApiProperty({ example: 'README.md', description: 'Nombre del archivo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FileType, example: 'markdown', description: 'Tipo de archivo' })
  @IsEnum(FileType)
  type: FileType;

  @ApiPropertyOptional({ description: 'Contenido del archivo' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: 1, description: 'ID de la carpeta contenedora' })
  @IsNumber()
  folderId: number;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ example: 'nuevo-nombre.md', description: 'Nuevo nombre' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Nuevo contenido' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Estado activo' })
  @IsOptional()
  isActive?: boolean;
}
