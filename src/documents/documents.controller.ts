import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('templates')
  async getTemplates() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.documentsService.getTemplates();
  }

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async createTemplate(@Body('name') name: string, @UploadedFile() file: any) {
    return this.documentsService.createTemplate(name, file);
  }

  @Post('sign')
  async createSignatureSubmission(
    @GetUser() user: User,
    @Body('templateId') templateId: string,
  ) {
    return this.documentsService.createSubmission(templateId, user);
  }

  @Post('upload-sign')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndSign(@GetUser() user: User, @UploadedFile() file: any) {
    return this.documentsService.uploadAndSign(file, user);
  }
}
