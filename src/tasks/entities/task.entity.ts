import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';

export type TaskStatus = 'Open' | 'Active' | 'Closed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

@Schema()
export class Attachment {
  @Prop()
  id: string;

  @Prop()
  fileName: string;

  @Prop()
  url: string;

  @Prop()
  size: number;

  @Prop()
  mimetype: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

@Schema()
export class Comment {
  @Prop()
  id: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  author: User;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

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
export class Task extends Document {
  declare id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({
    type: String,
    enum: ['Open', 'Active', 'Closed'],
    default: 'Open',
  })
  status: TaskStatus;

  @Prop({
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  })
  priority: TaskPriority;

  @Prop()
  dueDate: Date;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  owner: User;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  assignees: User[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Group' })
  assignedGroup: Group;

  @Prop({ type: [AttachmentSchema], default: [] })
  attachments: Attachment[];

  @Prop({ type: [CommentSchema], default: [] })
  comments: Comment[];

  createdAt: Date;
  updatedAt: Date;
  // @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Task' }] })
  // dependsOn: Task[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// FIX: Define a TaskDocument type to ensure Mongoose document properties and methods are available.
export type TaskDocument = Task & Document;
