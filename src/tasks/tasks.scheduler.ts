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
    this.logger.debug('Running scheduled job: Task Reminders...');

    let remindersSent = 0;

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
        remindersSent++;
      }
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
    for (const task of dueTodayTasks) {
      const recipients = this.getTaskRecipients(task);

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
        remindersSent++;
      }

      // Mark as sent so we don't repeat this hour
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.tasksService.markDueReminderSent(task.id);
    }

    // Handle tasks due today (In-app + Email)
    /* const dueTodayTasks = await this.tasksService.findTasksDueToday();
    for (const task of dueTodayTasks) {
      // Use a Map to ensure unique recipients based on email
      const recipients = new Map<string, any>();

      // Collect individual assignees
      if (task.assignees?.length > 0) {
        for (const assignee of task.assignees) {
          if (assignee.email) {
            recipients.set(assignee.email, assignee);
          }
        }
      }

      // Collect team members if any
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
      const owner: any = task.owner;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (owner && owner.email) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        recipients.set(owner.email, owner);
      }

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
        remindersSent++;
      }

      // Mark as sent so we don't repeat this hour
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.tasksService.markDueReminderSent(task.id);
    }

    */

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
