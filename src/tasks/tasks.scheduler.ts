import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleTaskReminders() {
    //let remindersSent = 0;
    this.logger.debug('Executing Task Reminders Sync...');

    const summary = {
      overdue: 0,
      dueToday: 0,
      dueSoon: 0,
      totalNotifications: 0,
    };

    // Handle overdue tasks (In-app + Email)
    const overdueTasks = await this.tasksService.findOverdueTasks();
    for (const task of overdueTasks) {
      const recipients = this.getTaskRecipients(task);
      for (const [email, user] of recipients.entries()) {
        // In-app notification
        await this.notificationsService.create({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          user: user,
          type: 'task',
          message: `Reminder: Task "${task.title}" is overdue.`,
        });

        // Email notification
        await this.emailService.sendTaskOverdueEmail(email, task.title);
        //remindersSent++;
        summary.totalNotifications++;
      }

      // Increment the count for this task so it stops after 2 notifications
      await this.tasksService.incrementOverdueReminderCount(task.id);
      summary.overdue++;
    }

    // Handle overdue tasks
    /*
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
    */

    // Handle tasks due today (In-app + Email)
    const dueTodayTasks = await this.tasksService.findTasksDueToday();
    console.log(`Due today Tasks ${JSON.stringify(dueTodayTasks)}`);
    for (const task of dueTodayTasks) {
      const recipients = this.getTaskRecipients(task);

      console.log(`Recipients: ${JSON.stringify(recipients)}`);
      // Send notifications to all collected recipients
      for (const [email, user] of recipients.entries()) {
        // In-app notification
        await this.notificationsService.create({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          user: user,
          type: 'task',
          message: `Action Required: Task "${task.title}" is due today!`,
        });

        // Email notification
        await this.emailService.sendTaskDueTodayEmail(email, task.title);
        //remindersSent++;
        summary.totalNotifications++;
      }

      // Mark as sent so we don't repeat this hour
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.tasksService.markDueReminderSent(task.id);
      summary.dueToday++;
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
          //remindersSent++;
          summary.totalNotifications++;
        }

        await this.tasksService.markDueSoonReminderSent(task.id);
        summary.dueSoon++;
      }
    }

    this.logger.debug(`Cron completed. Stats: ${JSON.stringify(summary)}`);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      stats: summary,
    };
  }

  private getTaskRecipients(task: any): Map<string, any> {
    const recipients = new Map<string, any>();

    // Collect individual assignees
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (task.assignees?.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const assignee of task.assignees) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (assignee.email) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          recipients.set(assignee.email, assignee);
        }
      }
    }

    // Collect team members if any
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const team: any = task.assignedTeam;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (team && team.members?.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      for (const member of team.members) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (member.email) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          recipients.set(member.email, member);
        }
      }
    }

    // Collect task owner (creator)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const owner: any = task.owner;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (owner && owner.email) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      recipients.set(owner.email, owner);
    }

    return recipients;
  }
}
