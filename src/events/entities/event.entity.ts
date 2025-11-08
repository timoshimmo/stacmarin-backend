import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type EventCategory = 'Workshop' | 'Social' | 'Holiday' | 'Meeting';

@Schema({
  timestamps: true,
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
export class Event extends Document {
  declare id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  start: Date;

  @Prop({ required: true })
  end: Date;

  @Prop({
    type: String,
    enum: ['Workshop', 'Social', 'Holiday', 'Meeting'],
    required: true,
  })
  category: EventCategory;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;
}

export const EventSchema = SchemaFactory.createForClass(Event);

export type EventDocument = Event & Document;
