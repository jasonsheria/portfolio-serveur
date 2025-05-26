import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Like extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
   // createdAt et updatedAt seront ajoutés par `timestamps: true` si vous l'activez
  @Prop({ default: Date.now }) 
  createdAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);
