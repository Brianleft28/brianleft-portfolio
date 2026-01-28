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

  @Column({ type: 'longtext' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ default: 0 })
  priority: number;

  @Column({ default: true })
  active: boolean;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.memories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

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
