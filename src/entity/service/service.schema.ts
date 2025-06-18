import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class OfferedService extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Site', required: true })
  site: Types.ObjectId | string;
  @Prop() service_name?: string;
  @Prop() service_descriptions?: string;
  @Prop() domaine_service?: string;
  @Prop() service_image?: string;
}

export const OfferedServiceSchema = SchemaFactory.createForClass(OfferedService);
