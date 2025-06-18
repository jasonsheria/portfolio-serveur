import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema()
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: User;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  timestamp: Date;
   // createdAt et updatedAt seront ajoutés par `timestamps: true` si vous l'activez
  @Prop({ default: Date.now }) 
  createdAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
