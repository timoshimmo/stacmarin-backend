import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

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
      'https://docuseal-n9m2.onrender.com',
    );
    this.docusealApiKey = this.configService.get<string>(
      'DOCUSEAL_API_KEY',
      'U3SBjvgDkfvADk8UC6P8qni1dVPXrFnneviCqQhWi6M',
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
      const templates = await this.fetchFromDocuseal('/api/v1/templates');

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

  async createSubmission(templateId: string, user: User) {
    try {
      // Create a submission (invitation to sign)
      // Docuseal API requires an array of submitters
      const payload = {
        template_id: parseInt(templateId, 10),
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
        send_email: false, // We will embed it or send custom notification
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal('/api/v1/submissions', {
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
        user: user,
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
      this.logger.error('Failed to create Docuseal submission:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to prepare signing invitation';
      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
