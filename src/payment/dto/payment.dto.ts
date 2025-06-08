// src/payment/dto/payment.dto.ts
import { IsNotEmpty, IsNumber, IsBoolean, IsEmail, isNumber, IsString, MinLength, IsDateString } from 'class-validator';

export class CreatePaymentDto {
    @IsNotEmpty()
    @IsString()
    projectId: string;
    @IsString()
    @MinLength(3, { message: 'Le nom doit contenir au moins 3 caractères' })
    cardHolderName?: string;

    @IsNumber()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    mobileNumber?: number;
    @IsString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    mobileMoneyPin?: string;

    @IsString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    cardNumber?: string;
    @IsDateString()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    expiryDate?: string;
    @IsNumber()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    cvv?: string;
    @IsNotEmpty()
    @IsNumber()
    @MinLength(6, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
    amount : number;

    @IsString()
    paymentMethod?: string;
   
    @IsString()
    userId?: string;
    
    @IsNumber()
    @IsNotEmpty()
    planId : number;

    @IsString()
    mobileMoneyProvider?: string;
    
    @IsString()
    @IsNotEmpty({ message: 'Le siteId est requis' })
    siteId: string;


}