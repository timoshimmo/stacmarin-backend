import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DocumentNotificationLog extends Document {
  @Prop({ required: true, index: true })
  submissionId!: string;

  @Prop({ required: true })
  submitterId!: string;

  @Prop({ required: true })
  type!: string; // 'signer_progress' | 'signing_completed'

  @Prop({ required: true })
  sentToEmail!: string;

  @Prop()
  signerEmail?: string;

  @Prop()
  signerName?: string;

  @Prop()
  createdAt?: Date;
}

export const DocumentNotificationLogSchema = SchemaFactory.createForClass(DocumentNotificationLog);
DocumentNotificationLogSchema.index({ submissionId: 1, submitterId: 1, type: 1 }, { unique: true });
