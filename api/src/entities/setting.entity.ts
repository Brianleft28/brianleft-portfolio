import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Configuraciones key-value del portfolio
 * Permite parametrizar: nombre del owner, contacto, links, etc.
 */
@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'varchar', length: 50, default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null; // 'owner', 'contact', 'social', 'branding'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
