import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Post } from '../posts/post.schema';
import { User } from '../users/user.schema';
@Schema({ timestamps: true })
export class Media extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: false })
  post?: Post;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: User;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true, enum: ['image', 'video', 'file', 'service'] })
  type: 'image' | 'video' | 'file' | 'service';

  @Prop()
  filename: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
