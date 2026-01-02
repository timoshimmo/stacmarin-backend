import { Injectable } from '@nestjs/common';
import { v2 } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: string,
    filename: string,
    mimetype: string,
    folder: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Determine resource type based on mimetype
      // Cloudinary needs 'raw' for non-media files to preserve extensions and content-type
      let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
      if (mimetype.startsWith('image/') || mimetype === 'application/pdf') {
        resourceType = 'image';
      } else if (mimetype.startsWith('video/')) {
        resourceType = 'video';
      } else {
        resourceType = 'raw';
      }

      // Remove extension from filename for public_id as Cloudinary adds it back for images/videos
      // but keep it for 'raw' files to ensure the extension is part of the stored filename.
      const publicId =
        resourceType === 'raw'
          ? filename
          : filename.split('.').slice(0, -1).join('.');

      void v2.uploader.upload(
        file,
        {
          folder: folder,
          resource_type: resourceType,
          public_id: publicId,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          if (error) return reject(error);
          if (result !== undefined) resolve(result.secure_url);
        },
      );
    });
  }

  /**
   * Specialized helper for profile avatars
   */
  async uploadImage(file: string): Promise<string> {
    // Avatars are always treated as images and saved in the avatar folder
    const timestamp = Date.now();
    return this.uploadFile(
      file,
      `avatar_${timestamp}`,
      'image/png',
      'stacconnect/avatar',
    );
  }
}

/*

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
*/
