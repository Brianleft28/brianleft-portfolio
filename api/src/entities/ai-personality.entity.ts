import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Personalidades de IA parametrizables
 * TorvaldsAi es solo una opción - se pueden crear otras
 */

@Entity('ai_personalities')
export class AiPersonality {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  slug: string; // 'torvalds', 'jobs', 'custom'

  @Column({ length: 255 })
  name: string; // 'TorvaldsAi', 'JobsAi'

  @Column({ length: 255 })
  displayName: string; // Nombre mostrado en UI

  @Column({ type: 'text' })
  description: string; // Descripción corta

  @Column({ type: 'longtext' })
  systemPrompt: string; // Prompt de personalidad completo

  @Column({ type: 'text', nullable: true })
  greeting: string | null; // Mensaje inicial al activar

  @Column({ type: 'json', nullable: true })
  traits: string[] | null; // ['directo', 'técnico', 'pragmático']

  @Column({ type: 'varchar', length: 50, default: 'es-AR' })
  language: string; // Idioma principal

  @Column({ type: 'varchar', length: 100, nullable: true })
  voiceStyle: string | null; // 'casual', 'formal', 'technical'

  @Column({ type: 'varchar', length: 50, default: 'assistant' })
  mode: string; // 'arquitecto', 'debugger', 'documentador', 'mentor', 'custom'

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  isDefault: boolean; // Solo una puede ser default

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
