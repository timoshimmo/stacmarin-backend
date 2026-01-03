import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
// Fix: Explicitly import Buffer from 'buffer' for type safety in environments with missing global node types
import { Buffer } from 'buffer';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  // Fix: Cast process to any to access cwd() method when Process type is incomplete
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  private readonly uploadRoot = path.join((process as any).cwd(), 'uploads');

  constructor() {
    this.ensureDirectoryExists(this.uploadRoot);
  }

  private ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Fix: Use imported Buffer type
  async saveFile(
    buffer: Buffer,
    originalName: string,
    subFolder: string,
  ): Promise<string> {
    const targetDir = path.join(this.uploadRoot, subFolder);
    this.ensureDirectoryExists(targetDir);

    const fileExt = path.extname(originalName);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(targetDir, fileName);

    await fs.promises.writeFile(filePath, buffer);

    // Return the relative URL path
    return `/uploads/${subFolder}/${fileName}`;
  }

  async saveBase64(base64Data: string, subFolder: string): Promise<string> {
    const targetDir = path.join(this.uploadRoot, subFolder);
    this.ensureDirectoryExists(targetDir);

    // Extract mime type and data
    const matches = base64Data.match(
      /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
    );
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const mimeType = matches[1];
    const data = matches[2];
    // Fix: Use imported Buffer class
    const buffer = Buffer.from(data, 'base64');

    const extension = mimeType.split('/')[1] || 'png';
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(targetDir, fileName);

    await fs.promises.writeFile(filePath, buffer);

    return `/uploads/${subFolder}/${fileName}`;
  }
}
