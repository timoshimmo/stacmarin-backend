
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
    },
  },
  toObject: { virtuals: true }
})
export class Department extends Document {
  id: string;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
