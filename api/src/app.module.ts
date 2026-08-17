import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FilesystemModule } from './modules/filesystem/filesystem.module';
import { MemoryModule } from './modules/memory/memory.module';
import { ChatModule } from './modules/chat/chat.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { HealthModule } from './modules/health/health.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AiPersonalitiesModule } from './modules/ai-personalities/ai-personalities.module';
import { ContactModule } from './modules/contact/contact.module';

// Entities
import { User } from './entities/user.entity';
import { Folder } from './entities/folder.entity';
import { File } from './entities/file.entity';
import { Memory } from './entities/memory.entity';
import { MemoryKeyword } from './entities/memory-keyword.entity';
import { Setting } from './entities/setting.entity';
import { AiPersonality } from './entities/ai-personality.entity';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '../.env',
    }),

    // TypeORM con MySQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USER', 'portfolio'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME', 'portfolio'),
        entities: [User, Folder, File, Memory, MemoryKeyword, Setting, AiPersonality],
        synchronize: process.env.NODE_ENV !== 'production', // Solo en dev
        logging: process.env.NODE_ENV !== 'production',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),

    // Rate limiting global con Redis
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1 segundo
            limit: 3,
          },
          {
            name: 'medium',
            ttl: 10000, // 10 segundos
            limit: 20,
          },
          {
            name: 'long',
            ttl: 60000, // 1 minuto
            limit: 100,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: configService.get('REDIS_HOST', 'redis'),
            port: configService.get<number>('REDIS_PORT', 6379),
          })
        ),
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    FilesystemModule,
    MemoryModule,
    ChatModule,
    ProjectsModule,
    HealthModule,
    UploadsModule,
    SettingsModule,
    AiPersonalitiesModule,
    ContactModule,
  ],
})
export class AppModule {}
