import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleTaskReminders() {
    this.logger.debug('Running scheduled job: Task Reminders...');

    let remindersSent = 0;

    // Handle overdue tasks
    const overdueTasks = await this.tasksService.findOverdueTasks();
    for (const task of overdueTasks) {
      if (task.assignees?.length > 0) {
        for (const assignee of task.assignees) {
          await this.notificationsService.create({
            user: assignee,
            type: 'task',
            message: `Reminder: Task "${task.title}" is overdue.`,
          });
          remindersSent++;
        }
      }
    }

    // Handle tasks due soon
    const dueSoonTasks = await this.tasksService.findTasksDueSoon();
    for (const task of dueSoonTasks) {
        if (task.assignees?.length > 0) {
            for (const assignee of task.assignees) {
                await this.notificationsService.create({
                    user: assignee,
                    type: 'task',
                    message: `Reminder: Task "${task.title}" is due in the next 24 hours.`,
                });
                remindersSent++;
            }
        }
    }
    
    if (remindersSent > 0) {
        this.logger.debug(`Sent ${remindersSent} task reminders.`);
    } else {
        this.logger.debug('No task reminders to send at this time.');
    }
  }
}
