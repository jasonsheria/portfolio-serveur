// src/users/user.entity.ts ou src/entity/users/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';

@Schema({ timestamps: true })
export class Site extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | string | User;
  @Prop() primaryColor?: string;
  @Prop() siteTitle?: string;
  @Prop() siteDescription?: string;
  @Prop() enableComments?: boolean;
  @Prop() itemsPerPage?: number;
  @Prop({ type: Object }) socialLinks?: any;
  @Prop() contactEmail?: string;
  @Prop() googleAnalyticsKey?: string;
  @Prop() siteLanguage?: string;
  @Prop({ required: true })
  siteName: string;
  @Prop({ required: true })
  siteType: string;
  @Prop() notifications?: boolean;
  @Prop() isSecure?: boolean;
  @Prop() isAuth?: boolean;
  @Prop() hasBlog?: boolean;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
