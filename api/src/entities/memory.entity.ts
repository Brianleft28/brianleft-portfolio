import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MemoryKeyword } from './memory-keyword.entity';
import { User } from './user.entity';

export enum MemoryType {
  PROJECT = 'project',
  META = 'meta',
  INDEX = 'index',
  DOCS = 'docs',
  CUSTOM = 'custom',
}

@Entity('memories')
@Index(['slug', 'userId'], { unique: true }) // Slug único por usuario
export class Memory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MemoryType,
  })
  type: MemoryType;

  @Column({ length: 100 })
  slug: string; // Ya no es unique globalmente, sino por usuario

  @Column({ length: 255 })
  title: string;

  // `type` explícito: con `string | null` la reflexión de TypeScript devuelve
  // `Object` y TypeORM no sabe mapearlo — la API no levanta.
  @Column({ name: 'title_en', type: 'varchar', length: 255, nullable: true })
  titleEn: string | null;

  @Column({ type: 'longtext' })
  content: string;

  /**
   * Traducción al inglés, versionada en `${MEMORY_PATH}/en/**`. `null` = sin
   * traducir; todo lo que lee esta columna cae al español cuando falta.
   */
  @Column({ name: 'content_en', type: 'longtext', nullable: true })
  contentEn: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'summary_en', type: 'text', nullable: true })
  summaryEn: string | null;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, (user) => user.memories, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @OneToMany(() => MemoryKeyword, (keyword) => keyword.memory, {
    cascade: true,
    eager: true,
  })
  keywords: MemoryKeyword[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
