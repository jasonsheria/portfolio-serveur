// src/auth/dto/login.dto.ts
 import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
   @IsEmail({}, { message: 'Veuillez fournir une adresse email valide.' })
  email: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères.' })
  @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' })
  password?: string;
}