import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StoredFile, StoredFileDocument } from './entities/stored-file.entity';
import { Buffer } from 'buffer';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    @InjectModel(StoredFile.name) private fileModel: Model<StoredFileDocument>,
  ) {}

  async saveFile(buffer: Buffer, originalName: string): Promise<string> {
    const createdFile = new this.fileModel({
      filename: originalName,
      mimetype: this.getMimeType(originalName),
      size: buffer.length,
      data: buffer,
    });

    const saved = await createdFile.save();
    // Return an API path that the FilesController will handle
    return `/files/download/${saved.id}`;
  }

  async saveBase64(base64Data: string): Promise<string> {
    const matches = base64Data.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
    );
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const mimeType = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    const extension = mimeType.split('/')[1] || 'png';
    const filename = `upload_${Date.now()}.${extension}`;

    const createdFile = new this.fileModel({
      filename: filename,
      mimetype: mimeType,
      size: buffer.length,
      data: buffer,
    });

    const saved = await createdFile.save();
    return `/files/download/${saved.id}`;
  }

  async getFile(id: string): Promise<StoredFileDocument | null> {
    return this.fileModel.findById(id).exec();
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }
}
