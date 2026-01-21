import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Folder } from './folder.entity';

export enum FileType {
  MARKDOWN = 'markdown',
  COMPONENT = 'component',
}

@Entity('files')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.MARKDOWN,
  })
  type: FileType;

  @Column({ type: 'longtext', nullable: true })
  content: string | null;

  @Column({ name: 'folder_id' })
  folderId: number;

  @ManyToOne(() => Folder, (folder) => folder.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
