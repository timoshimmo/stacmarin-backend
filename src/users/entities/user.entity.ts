import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Task } from '../../tasks/entities/task.entity';
import { Note } from '../../notes/entities/note.entity';
import { Notification } from '../../notifications/entities/notification.entity';

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  MEMBER = 'Member',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.__v;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.password;
    },
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret._id;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.__v;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete ret.password;
    },
  },
})
export class User extends Document {
  declare id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop()
  password?: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  role: UserRole;

  @Prop()
  title: string;

  @Prop()
  phone: string;

  @Prop()
  bio: string;

  @Prop()
  avatar: string;

  @Prop()
  department: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Task' }] })
  ownedTasks: Task[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Task' }] })
  tasks: Task[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Note' }] })
  notes: Note[];

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Notification' }],
  })
  notifications: Notification[];
}

export const UserSchema = SchemaFactory.createForClass(User);

// FIX: Define a UserDocument type to ensure Mongoose document properties and methods are available.
export type UserDocument = User & Document;
