import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from '../../entities/folder.entity';
import { File } from '../../entities/file.entity';
import { FilesystemService } from './filesystem.service';
import { FilesystemController } from './filesystem.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, File])],
  controllers: [FilesystemController],
  providers: [FilesystemService],
  exports: [FilesystemService],
})
export class FilesystemModule {}
