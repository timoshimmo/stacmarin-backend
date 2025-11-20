import { Injectable } from '@nestjs/common';
import { v2 } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadImage(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      v2.uploader.upload(file, { folder: 'stacconnect/avatars' }, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      });
    });
  }
}