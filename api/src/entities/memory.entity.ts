import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MemoryKeyword } from './memory-keyword.entity';

export enum MemoryType {
  PROJECT = 'project',
  META = 'meta',
  INDEX = 'index',
  DOCS = 'docs',
  CUSTOM = 'custom',
}

@Entity('memories')
export class Memory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: MemoryType,
  })
  type: MemoryType;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  active: boolean;

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
