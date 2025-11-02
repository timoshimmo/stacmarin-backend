import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type NotificationType = 'task' | 'kudos' | 'system' | 'mention';

@Schema({
  timestamps: { updatedAt: false },
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.__v;
    },
  },
  toObject: { virtuals: true },
})
export class Notification extends Document {
  declare id: string;

  @Prop({
    type: String,
    enum: ['task', 'kudos', 'system', 'mention'],
    default: 'system',
  })
  type: NotificationType;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  createdAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
