import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import * as jwt from 'jsonwebtoken';
import { put } from '@vercel/blob';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly docusealUrl: string;
  private readonly docusealApiKey: string;
  private readonly blobToken: string;

  constructor(
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {
    // DOCUSEAL_URL should be the Render URL of your Docuseal instance
    this.docusealUrl = this.configService.get<string>(
      'DOCUSEAL_BASE_URL',
      'https://api.docuseal.com',
    );
    this.docusealApiKey = this.configService.get<string>(
      'DOCUSEAL_API_KEY',
      'TJ8WwCevJbZskvB5Cr1YyWB23CzDUHAvYDxouPbrjVK',
    );
    this.blobToken = this.configService.get<string>(
      'BLOB_READ_WRITE_TOKEN',
      'vercel_blob_rw_AZL5HP1YNl92DRy2_xkvINmdQuSdvNNnfNMIjRcUl0J4oU6',
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
      const templates = await this.fetchFromDocuseal('/templates');

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

  /* Version 1
  async getSubmissions() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal('/submissions');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const submissionList = Array.isArray(result) ? result : result.data || [];
      const host = 'docuseal.com';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return submissionList.map((s) => this.mapSubmission(s, host));
    } catch (error) {
      this.logger.error('Failed to fetch submissions from Docuseal:', error);
      return [];
    }
  }

  */

  /* Version 2 with template slug mapping and improved signing URL logic
  async getSubmissions() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const [submissionsResult, templatesResult] = await Promise.all([
        this.fetchFromDocuseal('/submissions'),
        this.fetchFromDocuseal('/templates'),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, prettier/prettier, @typescript-eslint/no-unsafe-member-access
      const submissionList = Array.isArray(submissionsResult) ? submissionsResult : submissionsResult.data || [];
      // eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const templateList = Array.isArray(templatesResult) ? templatesResult : templatesResult.data || [];

      // Create a map of template_id to slug for efficient lookup
      const templateMap = new Map();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      templateList.forEach((t) => templateMap.set(t.id, t.slug));

      const host = this.getDocusealHost();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return submissionList.map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const templateId = s.template?.id || s.template_id;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const templateSlug = templateMap.get(templateId);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return this.mapSubmission(s, host, templateSlug);
      });
    } catch (error) {
      this.logger.error('Failed to fetch submissions from Docuseal:', error);
      return [];
    }
  }
*/

  async getSubmissions() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const submissionsResult = await this.fetchFromDocuseal('/submissions');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, prettier/prettier, @typescript-eslint/no-unsafe-member-access
      const submissionList = Array.isArray(submissionsResult) ? submissionsResult : (submissionsResult.data || []);

      // Extract unique template IDs from the submissions
      // eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const templateIds: number[] = Array.from(new Set(submissionList.map(s => (s.template?.id || s.template_id) as number).filter(id => !!id)));
      // eslint-disable-next-line prettier/prettier
      
      // Fetch template details for these IDs to get their slugs
      const templateMap = new Map<number, string>();
      await Promise.all(
        templateIds.map(async (id: number) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const template = await this.fetchFromDocuseal(`/templates/${id}`);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (template?.slug) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
              templateMap.set(id, template.slug);
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            this.logger.warn(
              `Could not fetch template ${id} details for slug mapping`,
            );
          }
        }),
      );

      const host = this.getDocusealHost();

      // Fetch full details for each submission to get external_id
      // eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const fullSubmissions = await Promise.all(submissionList.map(async (s: any) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
            return await this.fetchFromDocuseal(`/submissions/${s.id}`);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            this.logger.warn(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Could not fetch full details for submission ${s.id}`,
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return s;
          }
        }),
      );

      console.log(
        `FULL SUBMISSION: ${JSON.stringify(fullSubmissions, null, 2)}`,
      );

      return fullSubmissions.map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const templateId = (s.template?.id || s.template_id) as number;
        const templateSlug = templateMap.get(templateId);
        return this.mapSubmission(s, host, templateSlug);
      });
    } catch (error) {
      this.logger.error('Failed to fetch submissions from Docuseal:', error);
      return [];
    }
  }

  private getDocusealHost(): string | undefined {
    try {
      const host = new URL(this.docusealUrl).host;
      // If it's docuseal.com or api.docuseal.com, we return undefined
      // so the React components use their default cloud host (docuseal.com)
      if (host.includes('docuseal.com')) {
        return undefined;
      }
      return host;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return undefined;
    }
  }

  private mapSubmission(
    s: any,
    host: string | undefined,
    templateSlug?: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const firstSubmitter = s.submitters?.[0];
    // Use the signing URL from the submission or the first submitter
    // let signingUrl = s.url || firstSubmitter?.url;
    const displayHost = 'docuseal.com';
    const finalTemplateSlug = templateSlug;

    //const templateSlug = s.template?.slug || s.template_slug;

    console.log(`Template Slug: ${finalTemplateSlug}`);

    // Use the template signing URL format as requested: https://docuseal.com/d/{slug}
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, prettier/prettier, @typescript-eslint/no-unsafe-member-access
    let signingUrl = finalTemplateSlug ? `https://${displayHost}/d/${finalTemplateSlug}` : s.url || firstSubmitter?.url;

    // Fallback logic if template slug is not available
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!signingUrl && (firstSubmitter?.slug || s.slug)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      signingUrl = `https://${displayHost}/s/${firstSubmitter?.slug || s.slug}`;
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      id: s.id.toString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      slug: s.slug,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      url: signingUrl,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      status: s.status || 'pending',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      template_name: s.template?.name || s.template_name || 'Document',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      created_at: s.created_at,
      host: host,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      submitters:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        s.submitters?.map((sub: any) => ({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          id: sub.id.toString(),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          email: sub.email,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          download_url: s.documents?.[0]?.url || s.download_url,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          status: sub.status,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          url: sub.url,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          slug: sub.slug,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          external_id: sub.external_id,
        })) || [],
    };
  }

  async getSubmissionDetails(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const submission = await this.fetchFromDocuseal(`/submissions/${id}`);
      const host = this.getDocusealHost();

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, prettier/prettier
      const templateId = (submission.template?.id || submission.template_id) as number;
      let templateSlug: string | undefined;

      if (templateId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const template = await this.fetchFromDocuseal(
            `/templates/${templateId}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          templateSlug = template?.slug;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          /* empty */
        }
      }

      return this.mapSubmission(submission, host, templateSlug);
    } catch (error) {
      this.logger.error(`Failed to fetch submission ${id} details:`, error);
      throw new HttpException(
        'Failed to fetch submission details',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async resendSubmitterEmail(submitterId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await this.fetchFromDocuseal(`/submitters/${submitterId}/emails`, {
        method: 'POST',
      });
    } catch (error) {
      this.logger.error(
        `Failed to resend email for submitter ${submitterId}:`,
        error,
      );
      throw new HttpException(
        'Failed to resend email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSubmitterSignUrl(submitterId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const submitter = await this.fetchFromDocuseal(
        `/submitters/${submitterId}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      return { url: submitter.url };
    } catch (error) {
      this.logger.error(
        `Failed to fetch sign URL for submitter ${submitterId}:`,
        error,
      );
      throw new HttpException('Failed to fetch sign URL', HttpStatus.NOT_FOUND);
    }
  }

  async getTemplateDetails(id: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const template = await this.fetchFromDocuseal(`/templates/${id}`);

      // Aggregate schema from all documents and merge with top-level schema
      // Docuseal sometimes has fields in documents that aren't in the top-level schema yet
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, prettier/prettier, @typescript-eslint/no-unsafe-assignment
      const combinedSchema = Array.isArray(template.schema) ? [...template.schema] : [];
      
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (template.documents && Array.isArray(template.documents)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        template.documents.forEach((doc: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (doc.schema && Array.isArray(doc.schema)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            doc.schema.forEach((field: any) => {
              // Check if field already exists in combinedSchema to avoid duplicates
              // eslint-disable-next-line prettier/prettier
              const exists = combinedSchema.some((f: any) => 
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  (f.id && f.id === field.id) ||
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  (f.name && f.name === field.name && f.type === field.type),
              );
              if (!exists) {
                combinedSchema.push(field);
              }
            });
          }
        });
      }

      console.log('Template Details:', JSON.stringify(template));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log('Template Schema:', JSON.stringify(template.schema));
      console.log('Combined Schema:', JSON.stringify(combinedSchema));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log('Template Roles:', template.roles);

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        id: template.id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        name: template.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        slug: template.slug,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        description: template.description,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        roles: template.roles || [{ name: 'Signer' }], // Default to 'Signer' if no roles defined
        schema: combinedSchema,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        submitters: template.submitters || [],
      };
    } catch (error) {
      this.logger.error(`Failed to fetch template ${id} details:`, error);
      throw new HttpException(
        'Failed to fetch template details',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async createTemplate(name: string, file: any) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const base64File = file.buffer.toString('base64');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const filename = file.originalname.toLowerCase();

      //const base64File = `data:application/pdf;base64,${file.buffer.toString('base64')}`;

      const payload = {
        name: name,
        documents: [
          {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            name: file.originalname,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            file: base64File,
          },
        ],
      };

      // Determine endpoint based on file extension
      let endpoint = '/templates/pdf';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (filename.endsWith('.docx')) {
        endpoint = '/templates/docx';
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      } else if (filename.endsWith('.pdf')) {
        endpoint = '/templates/pdf';
      } else {
        // Default to PDF or let Docuseal handle it if possible,
        // but usually it's one of these two for templates.
        endpoint = '/templates/pdf';
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log(`Template Result`, JSON.stringify(result, null, 2));

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: result.id,
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

  /*
  private async uploadToCpanel(file: any): Promise<string> {
    // Placeholder for cPanel upload logic.
    // Replace this with your actual cPanel upload implementation (e.g., FTP or API call).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.logger.log(`Uploading ${file.originalname} to cPanel placeholder...`);

    // Example: Return a URL where the file would be accessible after upload
    const cpanelDomain = 'https://your-cpanel-domain.com';
    const uploadDirectory = '/documents/signing';
    const timestamp = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const sanitizedFilename = file.originalname.replace(/\s+/g, '_');

    const fileUrl = `${cpanelDomain}${uploadDirectory}/${timestamp}_${sanitizedFilename}`;

    this.logger.log(`File placeholder URL: ${fileUrl}`);

    // In a real implementation, you would perform the actual file transfer here:
    // 1. Using FTP (requires basic-ftp package)
    // 2. Using a custom PHP upload script on cPanel via POST request

    return fileUrl;
  }

  */

  /*
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
      const result = await this.fetchFromDocuseal('/submissions', {
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
  */

  async createSubmission(templateId: string, user: User, body?: any) {
    try {
      let payload: any;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (body && body.submitters) {
        // Flexible submission from our own UI
        payload = {
          template_id: parseInt(templateId, 10),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          submitters: body.submitters,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          order: body.order || 'random',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          send_email: body.send_email || true,
          external_id: crypto.randomUUID(),
        };
      } else {
        // Default quick sign logic
        payload = {
          template_id: parseInt(templateId, 10),
          submitters: [
            {
              email: user.email,
              role: 'Signer',
              name: user.name,
              external_id: crypto.randomUUID(),
            },
          ],
          send_email: false,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal('/submissions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const submission = Array.isArray(result) ? result[0] : result;

      if (!submission) {
        throw new Error('No submission returned from signature service');
      }

      await this.notificationsService.create({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: user.id as any,
        type: 'document',
        message: `Action Required: New document signature requested.`,
      });

      const host = this.getDocusealHost();

      // Fetch template details using the ID from the submission response to get the slug
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, prettier/prettier
      const templateIdFromSubmission = (submission.template?.id || submission.template_id) as number;
      let templateSlug: string | undefined;

      if (templateIdFromSubmission) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const template = await this.fetchFromDocuseal(
            `/templates/${templateIdFromSubmission}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          templateSlug = template?.slug;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          this.logger.warn(
            `Could not fetch template ${templateIdFromSubmission} details for slug mapping`,
          );
        }
      }

      return this.mapSubmission(submission, host, templateSlug);
    } catch (error) {
      this.logger.error('Failed to create Docuseal submission:', error);
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message || 'Failed to prepare signing invitation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadAndSign(file: any, user: User) {
    try {
      //const base64File = file.buffer.toString('base64');
      /*const template = await this.createTemplate(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `${file.originalname}`,
        file,
      );
      */
      // 1. Upload to Vercel Blob

      const { url: blobUrl } = await put(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `documents/${Date.now()}_${file.originalname}`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        file.buffer,
        {
          access: 'public',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          contentType: file.mimetype,
          allowOverwrite: true,
          token: this.blobToken,
        },
      );

      this.logger.log(`Document uploaded to Vercel Blob: ${blobUrl}`);

      //const cpanelUrl = await this.uploadToCpanel(file);

      // Generate a builder token for the uploaded document
      const token = jwt.sign(
        {
          user_email: 'help.stacconnect@gmail.com', //Email of the owner of the API signing key - admin user email.
          template_id: null, // The template we just created
          external_id: crypto.randomUUID(),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          name: file.originalname,
          document_urls: [blobUrl],
        },
        this.docusealApiKey,
        { algorithm: 'HS256' },
      );

      //document_url: ['https://stacmarine.com/documents/STAC_Marine_LetterHead.pdf]

      const host = 'https://api.docuseal.com';

      this.logger.log(
        `Generated builder token for API Key: ${this.docusealApiKey}`,
      );
      this.logger.log(`Builder token: ${token}`);
      this.logger.log(`Logged Email: ${user.email}`);

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

  async signBlob(url: string, filename: string, user: User) {
    try {
      this.logger.log(`Processing blob for signature: ${url} (${filename})`);

      // 1. Fetch file from URL to create template (Docuseal requires file content for template creation)
      const response = await fetch(url);
      // eslint-disable-next-line prettier/prettier
      if (!response.ok) throw new Error(`Failed to fetch file from blob storage: ${response.statusText}`);
      // eslint-disable-next-line prettier/prettier
      
      const arrayBuffer = await response.arrayBuffer();
      const base64File = Buffer.from(arrayBuffer).toString('base64');

      // 2. Create a template
      const templatePayload = {
        name: filename,
        documents: [
          {
            name: filename,
            file: base64File,
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const template = await this.fetchFromDocuseal('/templates/pdf', {
        method: 'POST',
        body: JSON.stringify(templatePayload),
      });

      // 3. Generate builder token
      const token = jwt.sign(
        {
          user_email: 'help.stacconnect@gmail.com',
          integration_email: user.email,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          template_id: template.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          name: template.name,
          //document_urls: [url],
          external_id: crypto.randomUUID(),
          iat: Math.floor(Date.now() / 1000),
        },
        this.docusealApiKey,
      );

      const host = this.getDocusealHost();

      return {
        token,
        host,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        templateId: template.id,
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate Docuseal builder token from blob:',
        error,
      );
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message || 'Failed to process document for builder',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTemplateFromBlob(name: string, url: string, filename: string) {
    try {
      this.logger.log(`Creating template from blob: ${url} (${filename})`);

      // 1. Fetch file from URL
      const response = await fetch(url);
      if (!response.ok)
        // eslint-disable-next-line prettier/prettier
        throw new Error(`Failed to fetch file from blob storage: ${response.statusText}`);
      // eslint-disable-next-line prettier/prettier
      
      const arrayBuffer = await response.arrayBuffer();
      const base64File = Buffer.from(arrayBuffer).toString('base64');

      // 2. Create a template
      const payload = {
        name: name,
        documents: [
          {
            name: filename,
            file: base64File,
          },
        ],
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.fetchFromDocuseal('/templates/pdf', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        id: result.id.toString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        name: result.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        slug: result.slug,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        description: result.description,
      };
    } catch (error) {
      this.logger.error('Failed to create Docuseal template from blob:', error);
      throw new HttpException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        error.message || 'Failed to create organization template from blob',
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
