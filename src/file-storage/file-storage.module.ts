import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileStorageService } from './file-storage.service';
import { FilesController } from './files.controller';
import { StoredFile, StoredFileSchema } from './entities/stored-file.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StoredFile.name, schema: StoredFileSchema },
    ]),
  ],
  providers: [FileStorageService],
  controllers: [FilesController],
  exports: [FileStorageService],
})
export class FileStorageModule {}
