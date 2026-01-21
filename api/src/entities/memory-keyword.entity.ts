import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Memory } from './memory.entity';

@Entity('memory_keywords')
@Unique(['memoryId', 'keyword'])
export class MemoryKeyword {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'memory_id' })
  memoryId: number;

  @ManyToOne(() => Memory, (memory) => memory.keywords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memory_id' })
  memory: Memory;

  @Column({ length: 100 })
  keyword: string;
}
