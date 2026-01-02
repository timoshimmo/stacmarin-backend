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

      // Cloudinary treats PDFs as 'image' resource type (documents)
      // This allows for correct MIME type serving and transformations like fl_attachment
      const isPdf =
        mimetype === 'application/pdf' ||
        filename.toLowerCase().endsWith('.pdf');

      if (mimetype.startsWith('image/') || isPdf) {
        resourceType = 'image';
      } else if (mimetype.startsWith('video/')) {
        resourceType = 'video';
      } else {
        resourceType = 'raw';
      }

      // Sanitize filename: remove extension for public_id for image/video/pdf
      // but keep it for 'raw' files as Cloudinary raw delivery requires it.
      const publicId =
        resourceType === 'raw'
          ? filename
          : filename
              .split('.')
              .slice(0, -1)
              .join('.')
              .replace(/[^a-zA-Z0-9_-]/g, '_');

      void v2.uploader.upload(
        file,
        {
          folder: folder,
          resource_type: resourceType,
          public_id: publicId,
          use_filename: true,
          unique_filename: true,
          access_mode: 'public',
          type: 'upload',
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
