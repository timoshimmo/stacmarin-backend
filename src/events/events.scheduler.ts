import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from './events.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsScheduler {
  private readonly logger = new Logger(EventsScheduler.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleEventReminders() {
    this.logger.debug('Running scheduled job: Event Reminders...');

    const upcomingEvents = await this.eventsService.findEventsDueSoon();

    if (upcomingEvents.length === 0) {
      this.logger.debug('No upcoming events needing reminders.');
      return;
    }

    this.logger.debug(
      `Found ${upcomingEvents.length} upcoming events to send reminders for.`,
    );
    let remindersSent = 0;

    for (const event of upcomingEvents) {
      if (event.attendees && event.attendees.length > 0) {
        for (const attendee of event.attendees) {
          // Format the start time for the notification message
          const startTime = new Date(event.start).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.notificationsService.create({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            user: attendee.id as any,
            type: 'event',
            message: `Reminder: You have an event "${event.title}" starting soon at ${startTime}.`,
          });
          remindersSent++;
        }
      }
      // Mark the event as having had its reminder sent to prevent re-sending
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await this.eventsService.markReminderAsSent(event.id);
    }

    if (remindersSent > 0) {
      this.logger.debug(`Sent ${remindersSent} event reminders.`);
    }
  }
}
