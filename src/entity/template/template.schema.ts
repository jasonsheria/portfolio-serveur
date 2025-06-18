import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Template extends Document {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: [String], required: true, validate: [(arr: string[]) => arr.length <= 3, 'Max 3 images'] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'Site', required: true })
  site: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
@Prop({ type : Boolean, default: true  }) // Ajouté pour indiquer si le template est public
  isPublic: boolean;    
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
