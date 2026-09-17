import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Req,
  HttpException,
  HttpStatus,
  Headers,
  Res,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { Request, Response } from 'express';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Headers() headers: any) {
    return this.documentsService.handleWebhook(body, headers);
  }

  @UseGuards(JwtAuthGuard)
  @Post('submissions/:id/notify-progress')
  async notifyProgress(@Param('id') id: string, @Body() body: any) {
    return this.documentsService.checkAndNotifySubmissionProgress(id, body?.submitterId?.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Get('templates')
  async getTemplates() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.getTemplates();
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions')
  async getSubmissions() {
    return this.documentsService.getSubmissions();
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:id')
  async getSubmissionDetails(@Param('id') id: string) {
    return this.documentsService.getSubmissionDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('submissions/:id/documents')
  async getSubmissionDocuments(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.getSubmissionDocuments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('submitters/:id/resend')
  async resendEmail(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.resendSubmitterEmail(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('submitters/:id/sign-url')
  async getSignUrl(@Param('id') id: string) {
    return this.documentsService.getSubmitterSignUrl(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async createTemplate(@Body('name') name: string, @UploadedFile() file: any) {
    return this.documentsService.createTemplate(name, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('templates/:id')
  async getTemplateDetails(@Param('id') id: string) {
    return this.documentsService.getTemplateDetails(id);
  }

  /*
  @Post('sign')
  async createSignatureSubmission(
    @GetUser() user: User,
    @Body('templateId') templateId: string,
  ) {
    return this.documentsService.createSubmission(templateId, user);
  }
  */

  @Get('proxy-pdf')
  async proxyPdf(@Req() req: Request, @Res() res: Response) {
    const url = req.query.url as string;
    // eslint-disable-next-line prettier/prettier
    if (!url) throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
    const { buffer, contentType } = await this.documentsService.proxyPdf(url);

    res.set('Content-Type', contentType);

    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sign')
  async createSignatureSubmission(
    @GetUser() user: User,
    @Body('templateId') templateId: string,
    @Body() body: any,
  ) {
    return this.documentsService.createSubmission(templateId, user, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-sign')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  uploadAndSign(@GetUser() user: User, @UploadedFile() file: any) {
    return this.documentsService.uploadAndSign(file, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sign-blob')
  async signBlob(
    @GetUser() user: User,
    @Body('url') url: string,
    @Body('filename') filename: string,
  ) {
    return this.documentsService.signBlob(url, filename, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('templates-blob')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createTemplateFromBlob(
    @Body('name') name: string,
    @Body('url') url: string,
    @Body('filename') filename: string,
  ) {
    return this.documentsService.createTemplateFromBlob(name, url, filename);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  async upload(@Body() body: HandleUploadBody, @Req() req: Request) {
    try {
      const jsonResponse = await handleUpload({
        body,
        request: req,
        // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-unused-vars
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          return {
            allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
            addOverwriteToken: true,
            tokenPayload: JSON.stringify({
              userId: 'user-id',
            }),
          };
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          console.log('blob upload completed', blob, tokenPayload);
        },
      });

      return jsonResponse;
      // eslint-disable-next-line prettier/prettier
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new HttpException(
        'Could not generate upload token',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
