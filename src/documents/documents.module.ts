import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../email/email.module';
import { DocumentNotificationLog, DocumentNotificationLogSchema } from './entities/document-notification-log.entity';

@Module({
  imports: [
    NotificationsModule,
    UsersModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: DocumentNotificationLog.name, schema: DocumentNotificationLogSchema }
    ])
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
