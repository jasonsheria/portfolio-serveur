import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger, // Ajout pour le logging
  ConflictException, // Ajout de ConflictException
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from '../entity/users/user.schema'; // Assurez-vous que ce chemin est correct
import { createTransport } from 'nodemailer';
require('dotenv').config();
import nodemailer from 'nodemailer'; // Importation de nodemailer
import { OAuth2Client, TokenPayload } from 'google-auth-library'; // Importations Google
import { ConfigService } from '@nestjs/config'; // Pour accéder aux variables d'env
import * as fs from 'fs'; // Importer fs
import * as path from 'path'; // Importer path
import { v4 as uuidv4 } from 'uuid'; // Importer uuidv4

// Interface pour la réponse utilisateur cohérente
export interface AuthUserResponse {
  _id?: string; // L'ID sera absent pour les utilisateurs Google non enregistrés en DB
  email: string;
  username: string;
  profileUrl?: string;
  // Incluez d'autres champs que votre frontend attend dans l'objet user de login/register
  isVerified?: boolean;
  isAdmin?: boolean;
  createdAt?: Date;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name); // Logger

  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService, // Injectez ConfigService
  ) {
    // Initialisez le client Google OAuth2
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }


  // --- Fonctions de hachage/comparaison des mots de passe ---

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    // console.log('Hachage du mot de passe avec bcrypt...', password); // Peut être retiré en production
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // --- Fonction d'Enregistrement (Register) ---
  async register(registerDto: RegisterDto, profileImage?: any): Promise<User> {
    const { username, email, password, isVerified, verificationToken, telephone } = registerDto;
    // Vérifier si l'email est déjà utilisé
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      await this.userService.deleteUserAndRelatedData(existingUser._id.toString());
    }
    let profileUrl = '';
    if (profileImage && profileImage.buffer) {
       try {
        const ext = profileImage.originalname.split('.').pop();
        const fileName = `profile_${Date.now()}_${uuidv4()}.${ext}`; // Utiliser UUID pour plus d'unicité
        // Assurez-vous que ce chemin est correct par rapport à la racine de votre projet NestJS
         const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'profile');
        // --- Fin du chemin de sauvegarde ---
        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
          this.logger.log(`Répertoire de téléchargement créé: ${uploadDir}`);
        }

        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, profileImage.buffer);
        this.logger.log(`Fichier image sauvegardé: ${filePath}`);

        // --- URL publique alignée avec main.ts ---
        // L'URL d'accès public doit correspondre au préfixe statique défini dans main.ts
        profileUrl = `/uploads/profile/${fileName}`;
        this.logger.log(`URL publique de l'image: ${profileUrl}`);
        // --- Fin de l'URL publique ---

      } catch (error) {
        console.error('Erreur lors de la sauvegarde du fichier image:', error);
        // Gérer l'erreur de sauvegarde de fichier si nécessaire
        // Vous pourriez vouloir lancer une exception ou continuer sans image de profil
      }
    }
    try {
      const hashedPassword = await this.hashPassword(password);
      const newUser = await this.userService.create({
        username,
        email,
        password: hashedPassword,
        isVerified,
        verificationToken,
        profileUrl,
        isGoogleAuth: false, // <-- Ajout explicite du champ isGoogleAuth
        telephone, // <-- Ajout explicite du champ téléphone
      });
      if (verificationToken) {
        await this.sendVerificationEmail(email, verificationToken);
      }
      return newUser;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email déjà utilisé');
      }
      this.logger.error('Erreur lors de l\'enregistrement de l\'utilisateur', error.stack);
      throw new InternalServerErrorException('Erreur interne du serveur');
    }
  }

  // --- Fonction de Connexion (Login) ---
  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: AuthUserResponse }> {
    const { email, password } = loginDto;
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }
    const payload = { email: user.email, sub: user._id };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: this.mapUserToAuthUserResponse(user) };
  }

  // --- Fonction de Vérification du Token JWT ---
  async verifyJwtToken(token: string): Promise<TokenPayload | null> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);
      return payload;
    } catch (error) {
      this.logger.warn('Token JWT invalide ou expiré', error);
      return null;
    }
  }

  // --- Fonction de Récupération de l'Utilisateur par le Token ---
  async getUserFromToken(token: string): Promise<User | null> {
    const payload = await this.verifyJwtToken(token);
    if (!payload) {
      return null;
    }
    const user = await this.userService.findById(payload.sub) as User;
    return user;
  }

  // --- Fonction de Déconnexion ---
  async logout(userId: string): Promise<void> {
    // Ici, ajoutez la logique de déconnexion si nécessaire (ex: suppression du refresh token)
    this.logger.log(`Déconnexion de l'utilisateur avec l'ID ${userId}`);
  }

  // --- Fonction de Mapping de l'Utilisateur à la Réponse Auth ---
  private mapUserToAuthUserResponse(user: User): AuthUserResponse {
    return {
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      profileUrl: user.profileUrl,
      isVerified: user.isVerified,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };
  }

  // --- Fonction de Connexion avec Google ---
  async loginWithGoogle(googleIdToken: string): Promise<{ accessToken: string; user: any }> {
    // Vérifie le token Google
    const ticket = await this.googleClient.verifyIdToken({ idToken: googleIdToken });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Token Google invalide');
    }
    const { email, name, picture } = payload;
    let user = await this.userService.findByEmail(email);
    let isFirstGoogle = false;
    if (!user) {
      // Crée un nouvel utilisateur si inexistant
      user = await this.userService.create({
        username: name,
        email,
        password: await this.hashPassword(Date.now().toString()), // Mot de passe temporaire
        profileUrl: picture,
        isVerified: true,
        isGoogleAuth: true, // Ajouté pour marquer la première connexion Google
      });
      isFirstGoogle = true;
    }
    const jwtPayload = { email: user.email, sub: user._id };
    const accessToken = this.jwtService.sign(jwtPayload);
    return { accessToken, user };
  }

  // --- Envoi d'email de vérification (SMTP) ---
  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    if (!email || !verificationToken) {
      throw new BadRequestException('Email et token de vérification requis');
    }
    // Récupère la config SMTP depuis les variables d'env
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT, 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || smtpUser;
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const transporter = createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true pour 465, false sinon
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: smtpUser, // Gmail exige que le champ 'from' soit exactement l'adresse authentifiée
      to: email,
      subject: 'Vérification de votre adresse email',
      html: `
        <h2>Bienvenue !</h2>
        <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:5px;">Vérifier mon email</a>
        <p>Ou copiez/collez ce lien dans votre navigateur :<br><code>${verifyUrl}</code></p>
      `,
    };
    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      throw new InternalServerErrorException('Impossible d\'envoyer l\'email de vérification.');
    }
  }

  // --- Envoi d'email de réinitialisation de mot de passe (mock) ---
  async sendResetPasswordEmail(email: string, resetToken: string): Promise<void> {
    // À remplacer par nodemailer ou un vrai service d'email
    this.logger.log(`[MOCK] Envoi d'email de réinitialisation à ${email} avec token: ${resetToken}`);
  }

  // --- Envoi d'email avec code de confirmation pour réinitialisation de mot de passe ---
  async sendPasswordResetCodeEmail(email: string, code: string, expires: Date): Promise<void> {
    // Utilise nodemailer pour envoyer le code
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT, 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || smtpUser;
    const transporter = createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const mailOptions = {
      from: smtpUser,
      to: email,
      subject: 'Code de confirmation pour réinitialisation du mot de passe',
      html: `<h2>Réinitialisation du mot de passe</h2>
        <p>Votre code de confirmation est : <b>${code}</b></p>
        <p>Ce code expire le : ${expires.toLocaleString()}</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
    };
    try {
      await transporter.sendMail(mailOptions);
    } catch (err) {
      throw new InternalServerErrorException('Impossible d\'envoyer l\'email de code de confirmation.');
    }
  }

  // --- Validation du code de réinitialisation de mot de passe ---
  async validatePasswordResetCode(email: string, code: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.passwordResetCode || !user.passwordResetCodeExpires || !user.passwordResetNewPassword) {
      throw new BadRequestException('Aucune demande de réinitialisation trouvée.');
    }
    if (user.passwordResetCode !== code) {
      throw new BadRequestException('Code de confirmation invalide.');
    }
    if (user.passwordResetCodeExpires < new Date()) {
      throw new BadRequestException('Code expiré.');
    }
    // Hache le nouveau mot de passe et applique
    const hashed = await this.hashPassword(user.passwordResetNewPassword);
    await this.userService.updatePasswordAndClearReset(email, hashed);
  }

  // Validation du token pour WebSocket (utilisé par ChatGateway)
  async validateWebSocketConnection(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) return null;
      const user = await this.userService.findById(payload.sub);
      return user as User;
    } catch (e) {
      this.logger.warn('Token WebSocket invalide ou expiré');
      return null;
    }
  }

  async validateUser(payload: any): Promise<User | null> {
    const userId = payload?.sub || payload?.id || payload?.userId;
    if (!userId) return null;
    const user = await this.userService.findById(userId);
    return user as User;
  }
}