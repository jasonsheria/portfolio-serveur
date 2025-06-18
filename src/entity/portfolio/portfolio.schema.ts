import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Portfolio extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Site' })
  site: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
