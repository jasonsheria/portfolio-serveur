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
  secondName?: string; // Ajouté

  @Prop({ required: false, default: null })
  telephone: string | null;

  @Prop({ required: false, default: null }) // Ajouté
  dateOfBirth?: string | null; // Ajouté

  @Prop({ required: false, default: '' })
  logo : string; 

  @Prop({ required: false, default: '' })
  address: string; 
  
  @Prop({ required: false, default: '' })
  city: string; 
  
  @Prop({ required: false, default: '' })
  country: string; 
  
  @Prop({ required: false, default: '' })
  postalCode: string; // Conserver si utilisé, sinon commenter/supprimer
  
  @Prop({ required: false, default: '' })
  description: string; 

  @Prop({ required: false, default: '' }) // Ajouté - experience
  experience?: string;

  @Prop({ required: false, default: '' })
  website: string; 

  // socialMedia: string; // Remplacé par des champs spécifiques ci-dessous

  @Prop({ required: false, default: '' }) // Ajouté - languesParlees
  languesParlees?: string;

  @Prop({ required: false, default: '' }) // Ajouté - sport
  sport?: string;

  @Prop({ required: false, default: '' }) // Ajouté - objectifs
  objectifs?: string;

  @Prop({ required: false, default: '' })
  companyName: string; 
  
  @Prop({ required: false, default: '' })
  companyDescription: string; 
  
  @Prop({ required: false, default: '' })
  companyWebsite: string; 
  
  @Prop({ required: false, default: '' })
  companyLogo: string; 
  
  @Prop({ required: false, default: '' })
  companyAddress: string; // Renommé depuis companyAdresse pour cohérence
  
  @Prop({ required: false, default: '' })
  companyPhone: string; 
  
  @Prop({ required: false, default: '' })
  companyEmail: string; 
  
  // companySocialMedia: string; // Remplacé par des champs spécifiques si nécessaire, sinon commenter/supprimer

  @Prop({ required: false, default: '' }) // Ajouté - linkedin
  linkedin?: string;

  @Prop({ required: false, default: '' }) // Ajouté - github
  github?: string;

  @Prop({ required: false, default: '' }) // Ajouté - facebook
  facebook?: string;

  @Prop({ required: false, default: '' }) // Ajouté - whatsapp
  whatsapp?: string;

  @Prop({ required: false, default: '' }) // Ajouté - instagram
  instagram?: string;

  @Prop({ required: false, default: '' })
  domaine: string; 
  
  @Prop({ required: false, default: '' })
  expertise : string; 

  @Prop({ required: false, default: '' }) // Ajouté - profileImage1
  profileImage1?: string;

  @Prop({ required: false, default: '' }) // Ajouté - profileImage2
  profileImage2?: string;

  @Prop({ required: false, default: '' }) // Ajouté - profileImage3
  profileImage3?: string;

  @Prop({ required: false, default: '' }) // Ajouté - cvFile
  cvFile?: string;

  // logoFile est déjà couvert par `logo` plus haut, si c'est le même. Sinon, clarifier.
  // Si `logo` est pour le logo personnel et `companyLogo` pour l'entreprise, c'est bon.
  // Si `logoFile` est un autre fichier, il faut l'ajouter.

  @Prop({ required: false, default: '' }) // Ajouté - postalCardFile
  postalCardFile?: string;

  // companyLogoFile est déjà couvert par `companyLogo` plus haut.

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

   @Prop({ required: false, default: null })
  passwordResetCode?: string | null;

  @Prop({ required: false, default: null })
  passwordResetCodeExpires?: Date | null;

  @Prop({ required: false, default: null })
  passwordResetNewPassword?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);