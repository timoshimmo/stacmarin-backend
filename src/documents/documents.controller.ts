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
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('templates')
  async getTemplates() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.getTemplates();
  }

  @Get('submissions')
  async getSubmissions() {
    return this.documentsService.getSubmissions();
  }

  @Get('submissions/:id')
  async getSubmissionDetails(@Param('id') id: string) {
    return this.documentsService.getSubmissionDetails(id);
  }

  @Post('submitters/:id/resend')
  async resendEmail(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.resendSubmitterEmail(id);
  }

  @Get('submitters/:id/sign-url')
  async getSignUrl(@Param('id') id: string) {
    return this.documentsService.getSubmitterSignUrl(id);
  }

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

  @Get('templates/:id')
  async getTemplateDetails(@Param('id') id: string) {
    return this.documentsService.getTemplateDetails(id);
  }

  @Post('sign')
  async createSignatureSubmission(
    @GetUser() user: User,
    @Body('templateId') templateId: string,
  ) {
    return this.documentsService.createSubmission(templateId, user);
  }

  @Post('upload-sign')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  uploadAndSign(@GetUser() user: User, @UploadedFile() file: any) {
    return this.documentsService.uploadAndSign(file, user);
  }

  @Post('sign-blob')
  async signBlob(
    @GetUser() user: User,
    @Body('url') url: string,
    @Body('filename') filename: string,
  ) {
    return this.documentsService.signBlob(url, filename, user);
  }

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

  @Post('upload')
  async upload(@Body() body: HandleUploadBody, @Req() req: Request) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const jsonResponse = await handleUpload({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
