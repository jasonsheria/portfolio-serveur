import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class OfferedService extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user:  User;
  @Prop({ required: true })
  service_name: string;
  @Prop()
  service_descriptions?: string;
  @Prop()
  domaine_service?: string;
  @Prop()
  service_image?: string;
  @Prop()
  price?: number;
  @Prop()
  isActive?: boolean;
}

export const OfferedServiceSchema = SchemaFactory.createForClass(OfferedService);
