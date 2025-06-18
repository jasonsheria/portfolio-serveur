import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Site', required: true })
  site: Types.ObjectId;
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ require: false })
  liens: string;

  @Prop({ default: 0 })
  likesCount: number;
  // createdAt et updatedAt seront ajoutés par `timestamps: true` si vous l'activez
  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  categories: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }], default: [] })
  tags: Types.ObjectId[];

  @Prop({ required: true, enum: ['Brouillon', 'Publié', 'Archivé'], default: 'Brouillon' })
  status: 'Brouillon' | 'Publié' | 'Archivé';

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Media' }], default: [] })
  media: Types.ObjectId[];
}

export const PostSchema = SchemaFactory.createForClass(Post);
