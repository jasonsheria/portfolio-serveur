import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Visit extends Document {
  @Prop({ required: true })
  ip: string;

  @Prop({ type: Date, required: true, default: () => new Date() })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Template', required: true })
  template: Types.ObjectId;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
