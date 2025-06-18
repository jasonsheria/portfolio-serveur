import { IsEmail, IsOptional, IsString, MinLength, IsUrl, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  secondName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsString()
  @IsOptional()
  telephone?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  cityy?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsString()
  @IsOptional()
  domaine?: string;

  @IsString()
  @IsOptional()
  expertise?: string;

  @IsString()
  @IsOptional()
  languesParlees?: string;

  @IsString()
  @IsOptional()
  sport?: string;

  @IsString()
  @IsOptional()
  objectifs?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsUrl()
  @IsOptional()
  companyWebsite?: string;

  @IsString()
  @IsOptional()
  companyDescription?: string;

  @IsEmail()
  @IsOptional()
  companyEmail?: string;

  @IsString()
  @IsOptional()
  companyAdresse?: string;

  @IsString()
  @IsOptional()
  companyPhone?: string;

  @IsUrl()
  @IsOptional()
  linkedin?: string;

  @IsUrl()
  @IsOptional()
  github?: string;

  @IsUrl()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  whatsapp?: string;

  @IsUrl()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  profileImage1?: string;

  @IsString()
  @IsOptional()
  profileImage2?: string;

  @IsString()
  @IsOptional()
  profileImage3?: string;

  @IsString()
  @IsOptional()
  cvFile?: string;

  @IsString()
  @IsOptional()
  logoFile?: string;

  @IsString()
  @IsOptional()
  postalCardFile?: string;

  @IsString()
  @IsOptional()
  companyLogoFile?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  verificationToken?: string | null;

  @IsString()
  @IsOptional()
  subscriptionType?: string;

  @IsString()
  @IsOptional()
  subscriptionStart?: string;

  @IsString()
  @IsOptional()
  subscriptionEnd?: string;
}