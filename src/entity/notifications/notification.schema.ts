import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';
@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  source: string;

  @Prop({ default: Date.now })
  date: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
