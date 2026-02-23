import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly docusealUrl: string;
  private readonly docusealApiKey: string;

  constructor(
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    // DOCUSEAL_URL should be the Render URL of your Docuseal instance
    this.docusealUrl = this.configService.get<string>(
      'DOCUSEAL_BASE_URL',
      'https://docuseal-main.onrender.com',
    );
    this.docusealApiKey = this.configService.get<string>(
      'DOCUSEAL_API_KEY',
      'TJ8WwCevJbZskvB5Cr1YyWB23CzDUHAvYDxouPbrjVK',
    );
  }

  private async fetchFromDocuseal(endpoint: string, options: RequestInit = {}) {
    const url = `${this.docusealUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Token': this.docusealApiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      this.logger.error(
        `Docuseal Error: ${response.statusText} for URL ${url}`,
      );
      throw new HttpException(
        'Signature service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return response.json();
  }

  async getTemplates() {
    try {
      // In a real multi-tenant scenario, you'd filter templates by tenant tags/ids
      // For now we get all active templates
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const templates = await this.fetchFromDocuseal('/api/templates');

      // Map to our simplified frontend format
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return (templates.data || []).map((t) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        id: t.id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        name: t.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        description: t.description,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch templates from Docuseal:', error);
      return []; // Return empty instead of crashing
    }
  }

  async createTemplate(name: string, file: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const base64File = `data:application/pdf;base64,${file.buffer.toString('base64')}`;
      //const base64File = file.buffer.toString('base64');

      const payload = {
        name: name,
        roles: [{ name: 'Signer' }],
        documents: [
          {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            name: file.originalname,
            file: base64File,
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal('/api/templates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log(`Template Result`, JSON.stringify(result, null, 2));

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        id: result.id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        name: result.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        description: result.description,
      };
    } catch (error) {
      this.logger.error('Failed to create Docuseal template:', {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: error.message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        response: error.response?.data, // If using axios/similar
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        stack: error.stack,
      });
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message || 'Failed to create organization template',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createSubmission(templateId: string, user: User) {
    try {
      // Create a submission (invitation to sign)
      // Docuseal API requires an array of submitters
      const payload = {
        template_id: templateId,
        submitters: [
          {
            email: user.email,
            role: 'Signer', // Depends on your template role name
            name: user.name,
            // Include tenant metadata to ensure multi-tenant isolation tracking
            external_id: user.id.toString(),
          },
        ],
        // Configuration for the signing experience
        send_email: true, // We will embed it or send custom notification
      };

      //const result = await this.fetchFromDocuseal('/api/submissions', {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal('/api/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // The API returns an array of submission objects
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const submission = result[0];

      if (!submission) {
        throw new Error('No submission returned from signature service');
      }

      // Notify the user in-app
      await this.notificationsService.create({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: user.id as any,
        type: 'document',
        message: `New document signature requested: Check your Document Signing tab.`,
      });

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        id: submission.id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        slug: submission.slug,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        url: submission.url, // This is the signing link for the user
        status: 'pending',
      };
    } catch (error) {
      this.logger.error(
        'Failed to create Docuseal submission:',
        JSON.stringify(error),
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log('STATUS:', error.response?.status);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log('DATA:', JSON.stringify(error.response?.data, null, 2));
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to prepare signing invitation';
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  uploadAndSign(file: any, user: User) {
    try {
      //const base64File = file.buffer.toString('base64');
      /*const template = await this.createTemplate(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Quick Sign: ${file.originalname}`,
        file,
      );
      */
      // Generate a builder token for the uploaded document
      const token = jwt.sign(
        {
          user_email: 'tokmangwang@gmail.com', //Email of the owner of the API signing key - admin user email.
          integration_email: user.email, //Email of the user to create a template for.
          external_id: `QuickSign_${Date.now()}`,
          template_id: 2,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: `STAC Marine Offshore ${file.originalname}`,
        },
        this.docusealApiKey,
      );

      //document_url: ['https://stacmarine.com/documents/STAC_Marine_LetterHead.pdf]

      const host = this.docusealUrl;

      this.logger.log(`Generated builder token for host: ${host}`);

      return {
        token,
        host,
      };
    } catch (error) {
      this.logger.error('Failed to generate Docuseal builder token:', error);
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message || 'Failed to process document for builder',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /*
  async uploadAndSign(file: any, user: User) {
    try {
      // Docuseal API requires file content as a base64 string
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const base64File = file.buffer.toString('base64');
      console.log('Document Uploaded For Signing');
      // 1. Create a one-off template from the uploaded file
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const templateResponse = await this.fetchFromDocuseal('/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          name: `Sign: ${file.originalname} - ${user.name} (${new Date().toLocaleDateString()})`,
          documents: [
            {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              name: file.originalname,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              file: base64File,
            },
          ],
        }),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!templateResponse || !templateResponse.id) {
        throw new Error('Failed to create temporary signing template');
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const templateId = templateResponse.id.toString();

      // 2. Immediately create a submission for the user for this new template
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return this.createSubmission(templateId, user);
    } catch (error) {
      this.logger.error('Failed to upload and create submission:', error);
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message || 'Failed to process document upload for signing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }*/
}
