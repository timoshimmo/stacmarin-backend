import { v2 } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: (configService: ConfigService) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return v2.config({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      api_key: configService.get('CLOUDINARY_API_KEY'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
  },
  inject: [ConfigService],
};
