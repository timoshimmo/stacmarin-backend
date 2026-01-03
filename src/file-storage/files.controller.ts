import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import express from 'express';
import { FileStorageService } from './file-storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: express.Response) {
    const file = await this.fileStorageService.getFile(id);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // FIX: Cast res to any to resolve property 'set' and 'send' missing errors on Express Response type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    (res as any).set({
      'Content-Type': file.mimetype,
      'Content-Length': file.size,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'public, max-age=31536000',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return (res as any).send(file.data);
  }
}
