import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskSchema } from './entities/task.entity';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksScheduler } from './tasks.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]), 
    UsersModule, 
    NotificationsModule
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksScheduler],
})
export class TasksModule {}
