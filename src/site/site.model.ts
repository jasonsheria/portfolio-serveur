import { Document, Types } from 'mongoose';

export interface Site extends Document {
  user: Types.ObjectId;
  primaryColor?: string;
  siteTitle?: string;
  siteDescription?: string;
  enableComments?: boolean;
  itemsPerPage?: number;
  socialLinks?: any;
  landingPageTemplate?: number;
  profilePageTemplate?: number;
  portfolioPageTemplate?: number;
  contactEmail?: string;
  googleAnalyticsKey?: string;
  siteLanguage?: string;
  service_name?: string;
  service_descriptions?: string;
  domaine_service?: string;
  service_image?: string;
}
