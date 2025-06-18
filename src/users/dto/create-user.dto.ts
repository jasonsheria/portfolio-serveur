// src/users/dto/create-user.dto.ts
import { IsBoolean, IsEmail, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  username ?: string;
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password: string;
  @IsString()
  telephone?: string | null;
  @IsString()
  profileUrl?: string; // Utilisé pour la photo de profil Google
  @IsString()
  logo?: string; // Logo optionnel
  @IsString()
  address?: string; // Adresse optionnelle
  @IsString()
  city?: string; // Ville optionnelle
  @IsString()
  country?: string; // Pays optionnel
  @IsString()
  postalCode?: string; // Code postal optionnel
  @IsString() 
  description?: string; // Description optionnelle
  @IsString()
  website?: string; // Site web optionnel
  @IsString()
  socialMedia?: string; // Réseaux sociaux optionnels
  @IsString()
  companyName?: string; // Nom de l'entreprise optionnel
  @IsString()
  companyDescription?: string; // Description de l'entreprise optionnelle
  @IsString()
  companyWebsite?: string; // Site web de l'entreprise optionnel
  @IsString()
  companyLogo?: string; // Logo de l'entreprise optionnel
  @IsString()
  companyAddress?: string; // Adresse de l'entreprise optionnelle
  @IsString()
  companyPhone?: string; // Téléphone de l'entreprise optionnel
  @IsString()
  companyEmail?: string; // Email de l'entreprise optionnel
  @IsString()
  companySocialMedia?: string; // Réseaux sociaux de l'entreprise optionnels
  @IsString()
  domaine?: string; // Domaine optionnel
  @IsString()
  expertise?: string; // Expertise optionnelle
  @IsBoolean()
  isVerified?: boolean;
  @IsString()
  verificationToken?: string;
  @IsBoolean()
  isGoogleAuth: boolean;
}