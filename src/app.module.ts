import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { NotesModule } from './notes/notes.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EmailModule } from './email/email.module';
import { DepartmentsModule } from './departments/departments.module';
import { WellnessModule } from './wellness/wellness.module';
import { FileStorageModule } from './file-storage/file-storage.module';
import { RecognitionModule } from './recognition/recognition.module';
import { SurveysModule } from './surveys/surveys.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the ConfigService available application-wide
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TasksModule,
    NotesModule,
    NotificationsModule,
    EventsModule,
    CloudinaryModule,
    EmailModule,
    DepartmentsModule,
    WellnessModule,
    RecognitionModule,
    FileStorageModule,
    SurveysModule,
    TeamsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
