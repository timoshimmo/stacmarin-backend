import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecognitionService } from './recognition.service';
import { RecognitionController } from './recognition.controller';
import { Recognition, RecognitionSchema } from './entities/recognition.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Recognition.name, schema: RecognitionSchema },
    ]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [RecognitionController],
  providers: [RecognitionService],
})
export class RecognitionModule {}
