import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';

@Schema({
  timestamps: { createdAt: false, updatedAt: 'lastModified' },
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
export class Note extends Document {
  declare id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  content: string;

  @Prop()
  lastModified: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: User;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
// FIX: Define a NoteDocument type to ensure Mongoose document properties and methods are available.
export type NoteDocument = Note & Document;
