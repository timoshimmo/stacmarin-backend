import { Injectable } from '@nestjs/common';
import { v2 } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadImage(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
      void v2.uploader.upload(
        file,
        {
          folder: 'stacconnect/avatars',
          resource_type: 'auto',
        },
        (error, result) => {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          if (error) return reject(error);
          if (result !== undefined) {
            resolve(result.secure_url);
          }
        },
      );
    });
  }
}
