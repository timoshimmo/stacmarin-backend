import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE', false), // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendWelcomeEmail(email: string, name: string) {
    const subject = 'Welcome to StacConnect!';
    const html = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Welcome to StacConnect, ${name}!</h2>
        <p>We are excited to have you on board.</p>
        <p>Your account has been successfully created. You can now log in to access your digital workspace.</p>
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
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>New Task Assignment</h2>
        <p>Hello,</p>
        <p><strong>${assignerName}</strong> has assigned you a new task: <strong>${taskTitle}</strong>.</p>
        <p>Please log in to your dashboard to view details and start working on it.</p>
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
