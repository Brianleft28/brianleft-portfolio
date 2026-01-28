import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Configuraciones key-value del portfolio
 * Permite parametrizar: nombre del owner, contacto, links, etc.
 * Cada usuario tiene sus propias configuraciones
 */
@Entity('settings')
@Index(['key', 'userId'], { unique: true }) // Key única por usuario
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  key: string; // Ya no es unique globalmente, sino por usuario

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', length: 50, default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null; // 'owner', 'contact', 'social', 'branding'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
