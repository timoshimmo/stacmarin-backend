import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const notification = new this.notificationModel(notificationData);
    return notification.save();
  }

  findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationModel.find({ user: userId })
      .sort({ createdAt: 'desc' })
      .limit(50)
      .exec();
  }

  async markAllAsRead(userId: string): Promise<{ message: string }> {
    await this.notificationModel.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } },
    ).exec();
    return { message: 'All notifications marked as read' };
  }
}
