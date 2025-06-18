// src/auth/dto/google-login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string; // ID Token de Google
}