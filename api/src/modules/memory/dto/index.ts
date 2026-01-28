import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemoryType } from '../../../entities/memory.entity';

export class CreateMemoryDto {
  @ApiProperty({ enum: MemoryType, example: 'project' })
  @IsEnum(MemoryType)
  type: MemoryType;

  @ApiProperty({ example: 'portfolio', description: 'Slug único' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Portfolio Interactivo', description: 'Título' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Contenido completo en Markdown' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Resumen generado por IA' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ example: 0, description: 'Prioridad (mayor = primero)' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    type: [String],
    example: ['portfolio', 'svelte', 'terminal'],
    description: 'Keywords para búsqueda',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}

export class UpdateMemoryDto {
  @ApiPropertyOptional({ description: 'Nuevo título' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Nuevo contenido' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Nuevo resumen' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ description: 'Nueva prioridad' })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Estado activo' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Nuevos keywords' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}
