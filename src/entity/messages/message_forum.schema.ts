import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MessageForum extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['text', 'image', 'video', 'audio', 'file'] })
  type: string;
  @Prop({ default: false, required: false })

   isCompressed: boolean;
  @Prop({ default: 0, required: false })
  size: number;
  @Prop({ required: false })
  filename: string;
  @Prop({ default: Date.now })
  date: Date;
}

export const MessageForumSchema = SchemaFactory.createForClass(MessageForum);
