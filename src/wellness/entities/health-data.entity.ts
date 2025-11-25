import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';

export type HealthSource = 'AppleHealth' | 'GoogleFit' | 'Manual';

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
export class HealthData extends Document {
  declare id: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  date: Date; // The specific day this data represents

  @Prop({ default: 0 })
  steps: number;

  @Prop({ default: 0 })
  caloriesBurned: number;

  @Prop({ default: 0 })
  sleepMinutes: number;

  @Prop({ default: 0 })
  waterIntakeMl: number;

  @Prop({ default: 0 })
  heartRateAvg: number;

  @Prop({
    type: String,
    enum: ['AppleHealth', 'GoogleFit', 'Manual'],
    default: 'Manual',
  })
  source: HealthSource;
}

export const HealthDataSchema = SchemaFactory.createForClass(HealthData);
// Compound index to ensure one record per user per day per source (or you might merge sources)
HealthDataSchema.index({ user: 1, date: 1 }, { unique: true });
