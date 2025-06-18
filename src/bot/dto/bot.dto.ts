import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
export class botDTO{
    @IsString({ message: 'Le message au chatbot doit etre une chaine de caractere' })
    @IsNotEmpty({ message: 'Le message au chatbot ne peut pas etre vide' })
    @MinLength(3, { message: 'Le message au chatbot doit contenir au moins 3 caractere' })
    message : string;

} 