import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendMailDto } from './dto/send-mail.dto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  private readonly apiUrl = 'https://comms.twilio.com/v1/Emails';
  private readonly authHeader: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    // Parse environment variables
   /*
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    // Robustly handle the boolean configuration.
    // Env vars are strings, so "false" becomes true in a boolean check if not parsed.
    const smtpSecureRaw = this.configService.get<string>('SMTP_SECURE');
    const isSecure =
      smtpSecureRaw === 'true' ||
      (smtpPort === 465 && smtpSecureRaw !== 'false');

    this.logger.log(
      `Configuring SMTP: Host=${smtpHost}, Port=${smtpPort}, Secure=${isSecure}`,
    );

    // Default to the vercel app url if not provided
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://stacmarine-webapp.vercel.app/#',
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // true for 465, false for other ports (587)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // Helps avoid issues with self-signed certificates in development
        rejectUnauthorized: false,
      },
    }); */

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
   

    this.authHeader =
      'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    this.fromEmail = this.configService.get<string>('TWILIO_FROM_EMAIL') || '';
    this.fromName = this.configService.get<string>('TWILIO_FROM_NAME') || '';
    // Default to the vercel app url if not provided
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://stacmarine-webapp.vercel.app/#',
    );
  }

  async sendWelcomeEmail(email: string, name: string) {
    const subject = 'Welcome to StacConnect!';
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to StacConnect, ${name}!</h2>
        <p>We are excited to have you on board.</p>
        <p>Your account has been successfully created. You can now log in to access your digital workspace.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/login" style="background-color: #39bc3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to StacConnect</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The StacConnect Team</p>
      </div>
    `;
   // await this.sendMail(email, subject, html);
    await this.sendMailTwilio({ to: email, subject, html });
  }

  async sendTaskAssignmentEmail(
    email: string,
    taskTitle: string,
    assignerName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    taskId: string,
  ) {
    const subject = `New Task Assigned: ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2>New Task Assignment</h2>
        <p>Hello,</p>
        <p><strong>${assignerName}</strong> has assigned you a new task: <strong>${taskTitle}</strong>.</p>
        <p>Please log in to your dashboard to view details and start working on it.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/tasks" style="background-color: #39bc3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The StacConnect Team</p>
      </div>
    `;
    // await this.sendMail(email, subject, html);
    await this.sendMailTwilio({ to: email, subject, html });
  }

  async sendTaskAssignmentTeamEmail(
    email: string,
    taskTitle: string,
    assignerName: string,
    teamName: string,
  ) {
    const subject = `New Task Assigned: ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2>New Task Assignment</h2>
        <p>Hello,</p>
        <p><strong>${assignerName}</strong> has assigned your team ${teamName} a new task: <strong>${taskTitle}</strong>.</p>
        <p>Please log in to your dashboard to view details and start working on it.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/tasks" style="background-color: #39bc3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The StacConnect Team</p>
      </div>
    `;
    // await this.sendMail(email, subject, html);
    await this.sendMailTwilio({ to: email, subject, html });
  }

  async sendTaskReminderEmail(
    email: string,
    taskTitle: string,
    requesterName: string,
  ) {
    const subject = `Reminder: ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Task Reminder</h2>
        <p>Hello,</p>
        <p>This is a gentle reminder regarding the task: <strong>${taskTitle}</strong>.</p>
        <p><strong>${requesterName}</strong> has requested that you check the status and due date of this task.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/tasks" style="background-color: #39bc3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task in Dashboard</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The StacConnect Team</p>
      </div>
    `;
    // await this.sendMail(email, subject, html);
    await this.sendMailTwilio({ to: email, subject, html });
  }

  async sendTaskDueTodayEmail(email: string, taskTitle: string) {
    const subject = `Urgent: Task Due Today - ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Task Due Today</h2>
        <p>Hello,</p>
        <p>This is an automated reminder that the following task is due today: <strong>${taskTitle}</strong>.</p>
        <p>Please ensure any necessary updates or completion actions are taken before the end of the day.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/tasks" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task in Dashboard</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The StacConnect Team</p>
      </div>
    `;
    // await this.sendMail(email, subject, html);
    await this.sendMailTwilio({ to: email, subject, html });
  }

  async sendTaskOverdueEmail(email: string, taskTitle: string) {
    const subject = `Overdue: Task - ${taskTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Task Overdue</h2>
        <p>Hello,</p>
        <p>The following task is now overdue: <strong>${taskTitle}</strong>.</p>
        <p>Please prioritize this task and update its status as soon as possible.</p>
        <br/>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${this.frontendUrl}/tasks" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Task in Dashboard</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The StacConnect Team</p>
      </div>
    `;
    // await this.sendMail(email, subject, html);
    await this.sendMailTwilio({ to: email, subject, html });
  }

  async sendSignerProgressEmail(
    toEmail: string,
    firstSignerName: string,
    documentTitle: string,
    signerName: string,
    signerEmail: string,
    signerRole: string,
    completedCount: number,
    totalSigners: number,
  ) {
    const subject = `Document Signing Update: ${signerName || signerEmail} has signed "${documentTitle}"`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #1e293b; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">STACCONNECT</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase;">Document Signature Progress</p>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Signature Progress Update</h2>
          <p>Hello ${firstSignerName || 'there'},</p>
          <p>A signer has just completed their signature for <strong>${documentTitle}</strong>.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Signer:</strong> ${signerName || signerEmail} ${signerEmail ? `&lt;${signerEmail}&gt;` : ''}</p>
            ${signerRole ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Role:</strong> ${signerRole}</p>` : ''}
            <p style="margin: 8px 0 4px 0; font-size: 14px;"><strong>Signing Progress:</strong> <span style="color: #2563eb; font-weight: bold;">${completedCount} of ${totalSigners}</span> signatures completed</p>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            As the first signer, you are receiving this sequential update. You will receive notifications as each subsequent party signs, until the final signer completes the document.
          </p>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${this.frontendUrl}/documents" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              View Document Status
            </a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
            Best regards,<br/>
            The StacConnect Team
          </p>
        </div>
      </div>
    `;
    await this.sendMailTwilio({ to: toEmail, subject, html });
  }


   async sendDocumentSigningCompletedEmail(
    toEmail: string,
    firstSignerName: string,
    documentTitle: string,
    lastSignerName: string,
    lastSignerEmail: string,
    lastSignerRole: string,
    downloadUrl?: string,
  ) {
    const subject = `Document Signing Complete: "${documentTitle}"`;
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">STACCONNECT</h1>
          <p style="color: #dcfce7; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase;">Signing Completed</p>
        </div>
        <div style="padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background-color: #dcfce7; color: #15803d; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
              ✓ All Signatures Complete
            </span>
          </div>

          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; text-align: center;">Document Signing is Complete!</h2>
          <p>Hello ${firstSignerName || 'there'},</p>
          <p>The document signing process for <strong>${documentTitle}</strong> has reached completion.</p>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Final Signer:</strong> ${lastSignerName || lastSignerEmail} ${lastSignerEmail ? `&lt;${lastSignerEmail}&gt;` : ''}</p>
            ${lastSignerRole ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Role:</strong> ${lastSignerRole}</p>` : ''}
            <p style="margin: 4px 0; font-size: 14px; color: #15803d;"><strong>Status:</strong> All required parties have signed.</p>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
            The final signature has been recorded and the document is now fully executed and available for download.
          </p>

          <div style="text-align: center; margin: 28px 0;">
            ${downloadUrl ? `
              <a href="${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}merge=true" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; margin-right: 8px;">
                Download Signed Document
              </a>
            ` : ''}
            <a href="${this.frontendUrl}/documents" style="background-color: #1e293b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              View in StacConnect
            </a>
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
            Best regards,<br/>
            The StacConnect Team
          </p>
        </div>
      </div>
    `;
    await this.sendMailTwilio({ to: toEmail, subject, html });
  }

  private async sendMail(to: string, subject: string, html: string) {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      // eslint-disable-next-line prettier/prettier
      '"StacConnect" <StacConnect@gmail.com>'
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      // We don't throw here to prevent blocking the main application flow if email fails
    }
  }

  async sendMailTwilio(dto: SendMailDto): Promise<void> {
    const toAddresses = Array.isArray(dto.to)
      ? dto.to.map((address) => ({ address }))
      : [{ address: dto.to }];

    const payload = {
      from: {
        address: this.fromEmail,
        name: this.fromName,
      },
      to: toAddresses,
      content: {
        subject: dto.subject,
        html: dto.html,
        ...(dto.text && { text: dto.text }),
      },
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Twilio email failed', data);
      throw new InternalServerErrorException(
        data?.message || 'Failed to send email',
      );
    }

    this.logger.log(`Email sent to ${dto.to}`);
  }
}
