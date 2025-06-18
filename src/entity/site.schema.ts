import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Site extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', unique: true, required: true })
  user: Types.ObjectId;

  @Prop() primaryColor?: string;
  @Prop() siteTitle?: string;
  @Prop() siteDescription?: string;
  @Prop() enableComments?: boolean;
  @Prop() itemsPerPage?: number;
  @Prop({ type: Object }) socialLinks?: any;
  @Prop({ type: Types.ObjectId, ref: 'Template' }) landingPageTemplate?: Types.ObjectId;
  @Prop() profilePageTemplate?: number;
  @Prop() portfolioPageTemplate?: number;
  @Prop() contactEmail?: string;
  @Prop() googleAnalyticsKey?: string;
  @Prop() siteLanguage?: string;
  // Services Offerts
  @Prop() service_name?: string;
  @Prop() service_descriptions?: string;
  @Prop() domaine_service?: string;
  @Prop() service_image?: string;
  @Prop({ required: true }) siteName: string;
  @Prop({ required: true }) siteType: string;
}

export const SiteSchema = SchemaFactory.createForClass(Site);
