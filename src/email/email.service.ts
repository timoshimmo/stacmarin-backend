import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    // Parse environment variables
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
    });
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
    await this.sendMail(email, subject, html);
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
    await this.sendMail(email, subject, html);
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
    await this.sendMail(email, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string) {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      // eslint-disable-next-line prettier/prettier
      '"StacConnect" <no-reply@stacconnect.com>'
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
}
