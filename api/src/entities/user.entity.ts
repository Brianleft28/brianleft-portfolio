import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Folder } from './folder.entity';
import { Memory } from './memory.entity';
import { Setting } from './setting.entity';
import { AiPersonality } from './ai-personality.entity';

export enum UserRole {
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ type: 'varchar', unique: true, length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({ type: 'varchar', name: 'display_name', length: 100, nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', name: 'subdomain', unique: true, length: 50, nullable: true })
  subdomain: string | null; // Para white-label: username.portfolio.dev

  @Column({ type: 'varchar', name: 'refresh_token', nullable: true, length: 500 })
  refreshToken: string | null;

  @OneToMany(() => Folder, (folder) => folder.user)
  folders: Folder[];

  @OneToMany(() => Memory, (memory) => memory.user)
  memories: Memory[];

  @OneToMany(() => Setting, (setting) => setting.user)
  settings: Setting[];

  @OneToMany(() => AiPersonality, (personality) => personality.user)
  aiPersonalities: AiPersonality[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
