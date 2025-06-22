import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Suggestion extends Document {
  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  firstName: string;

  @Prop({ required: false })
  lastName: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  phone: string;

  @Prop({ required: false })
  requestedAt: Date;

  @Prop({ required: false })
  service: string;

  @Prop({ required: false })
  source: string;

  @Prop({ required: false })
  type: string;

  @Prop({ required: false })
  userId: string;
}

export const SuggestionSchema = SchemaFactory.createForClass(Suggestion);
