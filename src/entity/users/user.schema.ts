// src/users/user.entity.ts ou src/entity/users/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // `timestamps: true` ajoute createdAt et updatedAt automatiquement
export class User extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true }) // Reste requis pour l'authentification par formulaire
  password?: string; // Marqué optionnel ici pour la clarté, mais votre logique s'assure qu'il y en a un pour le formulaire

  @Prop({ required: false, default: '' })
  profileUrl: string; // Utilisé pour la photo de profil Google
  @Prop({ required: false, default: null })
  telephone: string | null; // Téléphone optionnel
  @Prop({ required: false, default: '' })
  logo : string; // Logo optionnel
  @Prop({ required: false, default: '' })
  address: string; // Adresse optionnelle
  @Prop({ required: false, default: '' })
  city: string; // Ville optionnelle
  @Prop({ required: false, default: '' })
  country: string; // Pays optionnel
  @Prop({ required: false, default: '' })
  postalCode: string; // Code postal optionnel
  @Prop({ required: false, default: '' })
  description: string; // Description optionnelle
  @Prop({ required: false, default: '' })
  website: string; // Site web optionnel
  @Prop({ required: false, default: '' })
  socialMedia: string; // Réseaux sociaux optionnels
  @Prop({ required: false, default: '' })
  companyName: string; // Nom de l'entreprise optionnel
  @Prop({ required: false, default: '' })
  companyDescription: string; // Description de l'entreprise optionnelle
  @Prop({ required: false, default: '' })
  companyWebsite: string; // Site web de l'entreprise optionnel
  @Prop({ required: false, default: '' })
  companyLogo: string; // Logo de l'entreprise optionnel
  @Prop({ required: false, default: '' })
  companyAddress: string; // Adresse de l'entreprise optionnelle
  @Prop({ required: false, default: '' })
  companyPhone: string; // Téléphone de l'entreprise optionnel
  @Prop({ required: false, default: '' })
  companyEmail: string; // Email de l'entreprise optionnel
  @Prop({ required: false, default: '' })
  companySocialMedia: string; // Réseaux sociaux de l'entreprise optionnels
  @Prop({ required: false, default: '' })
  domaine: string; // Domaine optionnel
  @Prop({ required: false, default: '' })
  expertise : string; // Expertise optionnelle
  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ required: false, default: null })
  verificationToken: string | null;

  @Prop({ default: false })
  isAdmin: boolean;

  // createdAt et updatedAt seront ajoutés par `timestamps: true` si vous l'activez
  @Prop({ default: Date.now }) 
  createdAt: Date;

  // Optionnel: Pour explicitement marquer les utilisateurs ayant utilisé Google pour se connecter
   @Prop({ default: false })
   isGoogleAuth: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);