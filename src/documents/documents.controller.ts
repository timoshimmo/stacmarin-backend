import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('templates')
  async getTemplates() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.getTemplates();
  }

  @Post('sign')
  async createSignatureSubmission(
    @GetUser() user: User,
    @Body('templateId') templateId: string,
  ) {
    return this.documentsService.createSubmission(templateId, user);
  }
}
