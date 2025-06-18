// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException, UseGuards, Request, Get, UnauthorizedException, Query, NotFoundException, UseInterceptors, UploadedFile, Patch, UploadedFiles, ConflictException, InternalServerErrorException, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { NoExistingSessionGuard } from './guards/no-existing-session.guard';
import { Logger } from '@nestjs/common';
import { ChatGateway } from '../chat/chat.gateway';
import { createTransport } from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import type { Express } from 'express';


@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name); // Logger

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly chatGateway: ChatGateway, // Injection de la gateway
  ) { }



  @Post('api/register')
  @UseInterceptors(FileInterceptor('profileImage'))
  @HttpCode(HttpStatus.CREATED) // Réponse 201 Created
  async register(
    @Body() registerDto: any,
    @UploadedFile() profileImage: any // Utilise 'any' pour éviter l'erreur de type
  ) {
    console.log('CONTROLLER: profileImage reçu:', !!profileImage, profileImage ? profileImage.originalname : null, '| Taille:', profileImage ? profileImage.size : null);
    // Générer un token de vérification unique
    // Enregistrer l'utilisateur avec isVerified: false et le token de vérification
    await this.authService.register({ ...registerDto, isVerified: false, verificationToken: uuidv4() }, profileImage);
    // Envoyer l'email de confirmation

    return { message: 'Un email de confirmation a été envoyé. Veuillez vérifier votre boîte de réception.' };
  }

  @Get('api/verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    console.log('Token reçu pour vérification:', token);
    const user = await this.userService.findByVerificationToken(token);
    console.log('Utilisateur trouvé:', user);
    if (!user) {
      throw new UnauthorizedException('Lien de vérification invalide ou expiré.');
    }
    await this.userService.updateUser(user._id.toString(), { isVerified: true, verificationToken: null });
    return { message: 'Votre adresse email a été vérifiée. Vous pouvez maintenant vous connecter.' };
  }

  @Post('api/login')
  @HttpCode(HttpStatus.OK) // Réponse 200 OK
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Exemple de route protégée par JWT
  @UseGuards(JwtAuthGuard) // Utilise le guard JWT pour protéger cette route
  @Get('api/profile')
  async getProfile(@Request() req) {
    // Récupérer le token dans le header Authorization
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }
    // Décoder le token pour obtenir le userId
    const jwt = require('jsonwebtoken');
    const decoded: any = jwt.decode(token);
    const userId = decoded?.userId || decoded?.id || decoded?.sub;
    if (!userId) {
      throw new UnauthorizedException('Token invalide');
    }
    // Recherche du user complet en base
    return this.userService.findById(userId);

  }
  @UseGuards(NoExistingSessionGuard) // Appliquer le garde ici
  @Post('api/google/login') // Nouvelle route
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() googleLoginDto: GoogleLoginDto, @Request() req, @Res() res) {
    this.logger.log(`Tentative de connexion Google pour le token : ${googleLoginDto.token?.substring(0, 20)}...`);
    try {
      const result = await this.authService.loginWithGoogle(googleLoginDto.token);
      this.logger.log(`Connexion Google réussie pour: ${result.user.email}`);
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
        debug: 'googleLogin OK',
        origin: req.headers.origin || null
      });
    } catch (error) {
      this.logger.error(`Échec de l'endpoint googleLogin: ${error.message}`, error.stack);
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.status(200).json({
        error: true,
        message: error.message || 'Erreur serveur',
        debug: 'googleLogin ERROR',
        origin: req.headers.origin || null
      });
    }
  }

  @Post('api/google')
  @HttpCode(HttpStatus.OK)
  async googleLoginFromStatic(@Body('credential') credential: string) {
    if (!credential) {
      throw new BadRequestException('Token Google manquant');
    }
    this.logger.log(`[STATIC] Tentative de connexion Google pour le token : ${credential.substring(0, 20)}...`);
    try {
      const result = await this.authService.loginWithGoogle(credential);
      this.logger.log(`[STATIC] Connexion Google réussie pour: ${result.user.email}`);
      return {
        token: result.accessToken,
        user: result.user,
      };
    } catch (error) {
      this.logger.error(`[STATIC] Échec de l'endpoint googleLogin: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('api/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        userId = decoded?.userId || decoded?.id || decoded?.sub;
      } catch (e) { }
    }
    this.logger.log(`Déconnexion demandée pour userId: ${userId}`);
    // Notifier la gateway WebSocket
    this.chatGateway.notifyUserLogout(userId);
    return { message: 'Déconnexion réussie' };
  }
  // creer une fonction pour mettre en jour le user present dans userService
  @UseGuards(JwtAuthGuard)
  @Patch('api/update-profile')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profileImage1', maxCount: 1 },
    { name: 'profileImage2', maxCount: 1 },
    { name: 'profileImage3', maxCount: 1 },
    { name: 'cvFile', maxCount: 1 },
    { name: 'logoFile', maxCount: 1 },
    { name: 'postalCardFile', maxCount: 1 },
    { name: 'companyLogoFile', maxCount: 1 },
  ]))
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles() files: {
      profileImage1?: Express.Multer.File[],
      profileImage2?: Express.Multer.File[],
      profileImage3?: Express.Multer.File[],
      cvFile?: Express.Multer.File[],
      logoFile?: Express.Multer.File[],
      postalCardFile?: Express.Multer.File[],
      companyLogoFile?: Express.Multer.File[],
    }
  ) {
    this.logger.debug(`updateProfile: req.user = ${JSON.stringify(req.user)}`);
    this.logger.debug(`Received request to update profile for user ID: ${req.user.userId}`);
    

    try {
      const updatedUser = await this.userService.updateUser(req.user.userId, updateUserDto, files);
      return { message: 'Profil mis à jour avec succès', user: updatedUser };
    } catch (error) {
      this.logger.error(`Profile update failed for user ID ${req.user.userId}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error; // Re-throw known exceptions
      }
      throw new InternalServerErrorException('Une erreur est survenue lors de la mise à jour du profil.');
    }
  }

  @Post('api/resend-verification')
  async resendVerification(@Body('email') email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException("Aucun utilisateur trouvé avec cet email.");
    }
    if (user.isVerified) {
      throw new BadRequestException("Ce compte est déjà vérifié.");
    }
    // Regénère un token si besoin
    let verificationToken = user.verificationToken;
    if (!verificationToken) {
      verificationToken = uuidv4();
      await this.userService.updateUser(user.id, { verificationToken });

      // Utilise la méthode du service pour envoyer l'email
      await this.authService.sendVerificationEmail(user.email, verificationToken);
      return { message: "Un nouvel email de vérification a été envoyé." };
    }
  }
  @Post('api/forgot-password')
  async forgotPassword(@Body('email') email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new NotFoundException("Aucun utilisateur trouvé avec cet email.");
    }
    // Générer un token de réinitialisation
    const resetToken = uuidv4();
    // await this.userService.updateUser(user.id, { resetToken });
    // Envoyer l'email de réinitialisation
    await this.authService.sendResetPasswordEmail(user.email, resetToken);
    return { message: "Un email de réinitialisation a été envoyé." };
  }
  @Post('api/reset-password')
  async resetPassword(@Body('token') token: string, @Body('newPassword') newPassword: string) {
    const user = await this.userService.findByResetToken(token);
    if (!user) {
      throw new NotFoundException("Lien de réinitialisation invalide ou expiré.");
    }
    // Mettre à jour le mot de passe
    // const updatedUser = await this.authService.updatePassword(user.id, newPassword);
    // Nettoyer le token de réinitialisation
    // await this.userService.updateUser(user.id, { resetToken: null });
    return { message: "Mot de passe réinitialisé avec succès." };
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body('email') email: string, @Body('newPassword') newPassword: string) {
    if (!email || !newPassword) {
      throw new BadRequestException('Email et nouveau mot de passe requis.');
    }
    // LOG pour debug : afficher le nouveau mot de passe reçu
    console.log('[DEBUG] Nouveau mot de passe reçu pour réinitialisation:', newPassword);
    // Génère un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.userService.setPasswordResetCode(email, code, expires, newPassword);
    await this.authService.sendPasswordResetCodeEmail(email, code, expires);
    return { message: 'Un code de confirmation a été envoyé à votre email.' };
  }

  @Post('validate-password-reset')
  async validatePasswordReset(@Body('email') email: string, @Body('code') code: string) {
    if (!email || !code) {
      throw new BadRequestException('Email et code requis.');
    }
    await this.authService.validatePasswordResetCode(email, code);
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}