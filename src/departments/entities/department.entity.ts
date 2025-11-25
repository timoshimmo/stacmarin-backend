import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
export class Department extends Document {
  declare id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
