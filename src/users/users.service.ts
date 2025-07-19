// src/users/users.service.ts
import {
  Injectable,
  NotFoundException, // Utile pour les cas où un élément n'est pas trouvé
  ConflictException, // Utile pour les cas de duplication (email existant)
  Logger // Pour le logging
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
// Importez le décorateur InjectModel
import { InjectModel } from '@nestjs/mongoose';
// Importez le type Model de mongoose
import { Model } from 'mongoose';
// Importez l'interface/type de votre document Mongoose User.
// Assurez-vous que le chemin et les noms (User, UserDocument) correspondent à votre fichier user.schema.ts
import { User} from '../entity/users/user.schema';
import { UpdateUserDto } from './dto/update-user.dto'; // Import UpdateUserDto
import * as fs from 'fs'; // Import fs
import * as path from 'path'; // Import path
import { Payment } from '../entity/payment/payment.schema';
import * as bcrypt from 'bcrypt';
import type { Express } from 'express';
import { removeBackground } from '../common/remove-bg.util';
import * as FormData from 'form-data';

@Injectable()
export class UsersService {

    private readonly logger = new Logger(UsersService.name);

    // Injectez le modèle Mongoose pour l'entité User.
    // NestJS et Mongoose s'occupent de fournir l'instance correcte du modèle.
    // Le nom de la propriété injectée (ici userModel) est ce que vous utiliserez pour interagir avec la collection 'users'.
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    ) {
        // L'ancienne simulation en mémoire (private readonly usersModel: Model<User>, this.usersModel = userModel,
        // ainsi que les références à this.users et this.nextId) a été retirée.
        // Toutes les opérations de base de données se feront maintenant via this.userModel.
    }

    /**
     * Trouve un utilisateur par son email.
     * @param email L'email de l'utilisateur à chercher.
     * @returns Promise<UserDocument | null> Une promesse qui résout en un document Mongoose User ou null si aucun utilisateur n'est trouvé.
     */
    async findByEmail(email: string): Promise<User | null> {
        this.logger.debug(`Searching for user with email: ${email}`);
        // Utilisez la méthode findOne() du modèle Mongoose pour chercher un unique document basé sur un critère.
        // { email: email } est l'objet filtre.
        // .exec() exécute la requête et retourne une promesse.
        const user = await this.userModel.findOne({ email: email }).exec();
        // Mongoose findOne() retourne le document trouvé ou null si aucun document ne correspond.
        return user;
    }

    /**
     * Trouve un utilisateur par son ID MongoDB (_id).
     * @param id L'ID MongoDB de l'utilisateur à chercher.
     * @returns Promise<UserDocument | null> Une promesse qui résout en un document Mongoose User ou null si non trouvé.
     */
    async findById(id: string): Promise<Partial<User> | null> { // MongoDB _id est généralement un string (ObjectId)
        this.logger.debug(`Searching for user with ID: ${id}`);
        const user = await this.userModel.findById(id).exec();
        if (!user) return null;
        // On filtre les champs sensibles (ex: password)
        const { password, ...safeUser } = user.toObject();
        return safeUser;
    }

    /**
     * Trouve un utilisateur par son ID MongoDB (_id) et retourne tous les champs (y compris password).
     * @param id L'ID MongoDB de l'utilisateur à chercher.
     * @returns Promise<User | null> Le document Mongoose User complet ou null si non trouvé.
     */
    async findByIdWithPassword(id: string): Promise<User | null> {
        this.logger.debug(`Searching for user with ID (with password): ${id}`);
        return this.userModel.findById(id).exec();
    }

    /**
     * Crée un nouvel utilisateur et le sauvegarde en base de données.
     * @param createUserDto Les données (email, password) pour créer l'utilisateur.
     * @returns Promise<UserDocument> Une promesse qui résout en le document Mongoose User créé et sauvegardé.
     * @throws ConflictException Si un utilisateur avec cet email existe déjà.
     * @throws Error Peut lever d'autres erreurs Mongoose/MongoDB en cas de problème de sauvegarde.
     */
    async create(createUserDto: CreateUserDto & { profileFile?: any }): Promise<User> {
        this.logger.debug(`Attempting to create user with email: ${createUserDto.email}`);

        // 1. Vérifier si un utilisateur avec le même email existe déjà.
        // C'est important pour l'intégrité des données si l'email doit être unique.
        // Vous devriez aussi avoir un index unique sur le champ 'email' dans votre UserSchema pour une validation au niveau de la base de données.
        const existingUser = await this.findByEmail(createUserDto.email);
        if (existingUser) {
            this.logger.warn(`User creation failed: Email already exists - ${createUserDto.email}`);
            // Utiliser ConflictException (code 409) est approprié ici selon les conventions REST/HTTP
            throw new ConflictException('Un utilisateur avec cet email existe déjà.');
        }

        // 2. Gestion de la photo de profil si présente (upload dans le dossier backend)
        let profileUrl = '';
        if (createUserDto.profileFile) {
            const file = createUserDto.profileFile;
            // Vérification du type MIME (image uniquement)
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.mimetype)) {
                throw new NotFoundException('Format de fichier non supporté. Formats acceptés : jpg, jpeg, png, webp');
            }
            // Vérification de la taille (max 2Mo)
            const maxSize = 2 * 1024 * 1024; // 2 Mo
            if (file.size > maxSize) {
                throw new NotFoundException('La taille de la photo de profil ne doit pas dépasser 2 Mo.');
            }
            // Générer un nom de fichier unique
            const ext = file.originalname.split('.').pop();
            const fileName = `profile_${Date.now()}_${Math.floor(Math.random()*10000)}.${ext}`;
            const fs = require('fs');
            const path = require('path');
            const profileDir = path.join('/upload', 'profile');
            if (!fs.existsSync(profileDir)) {
                fs.mkdirSync(profileDir, { recursive: true });
            }
            const filePath = path.join(profileDir, fileName);
            fs.writeFileSync(filePath, file.buffer);
            // Stocker le chemin relatif pour le frontend (à servir en statique)
            profileUrl = `/uploads/profile/${fileName}`;
        } else {
            profileUrl = createUserDto.profileUrl || '';
        }

        // 3. Créer une nouvelle instance du document Mongoose
        const newUser = new this.userModel({
            username : createUserDto.username,
            email: createUserDto.email,
            // IMPORTANT TRÈS IMPORTANT :
            // NE JAMAIS SAUVEGARDER LES MOTS DE PASSE EN CLAIR EN BASE DE DONNÉES !
            // Vous devez HACHER le mot de passe (en utilisant une bibliothèque comme bcrypt)
            // AVANT de le sauvegarder.
            // L'endroit idéal pour le hachage est soit ici avant la création, soit dans un hook 'pre("save")'
            // sur votre UserSchema.
            password: createUserDto.password, // <<< CE MOT DE PASSE DOIT ÊTRE HACHÉ !!!
            telephone: createUserDto.telephone || null,
            profileUrl: profileUrl,
            verificationToken : createUserDto.verificationToken || null,
            isVerified: createUserDto.isVerified || false,
            isGoogleAuth: createUserDto.isGoogleAuth === true, // <-- Correction ici
            // ... autres champs
        });

        // 4. Sauvegarder la nouvelle instance du document dans la base de données MongoDB.
        try {
            const savedUser = await newUser.save();
            this.logger.log(`User created successfully with ID: ${savedUser._id}`);
            // 4. Retourner le document sauvegardé.
            return savedUser;
        } catch (error) {
            // Gérer les erreurs potentielles qui pourraient survenir lors de la sauvegarde (ex: validation Mongoose, erreurs de connexion BD).
             this.logger.error(`Error saving user with email ${createUserDto.email}: ${error.message}`, error.stack);
             // Lancer l'erreur pour qu'elle soit gérée plus haut (par exemple, dans un controller ou un gestionnaire d'exceptions global).
            throw error;
        }

        // Note : Une alternative plus courte pour créer et sauvegarder en une seule étape est d'utiliser userModel.create()
        // return this.userModel.create({ email: createUserDto.email, password: createUserDto.password /* HASHED */ });
        // try {
        //     const savedUser = await this.userModel.create({
        //          email: createUserDto.email,
        //          password: createUserDto.password // <<< HASHED !!!
        //     });
        //     this.logger.log(`User created successfully with ID: ${savedUser._id}`);
        //     return savedUser;
        // } catch (error) {
        //      this.logger.error(`Error creating user with email ${createUserDto.email}: ${error.message}`, error.stack);
        //      throw error;
        // }
    }

    /**
     * Met à jour un utilisateur par son _id.
     * @param id L'ID MongoDB de l'utilisateur à mettre à jour.
     * @param updateUserDto Les champs à mettre à jour.
     * @param files Optionnel: un objet contenant les fichiers uploadés.
     * @returns Promise<Partial<User> | null> L'utilisateur mis à jour sans le mot de passe, ou null si non trouvé.
     * @throws NotFoundException si l'utilisateur n'existe pas.
     * @throws ConflictException si la mise à jour de l'email est tentée.
     */
    async updateUser(
        id: string,
        updateUserDto: UpdateUserDto,
        files?: {
            profileImage1?: Express.Multer.File[],
            profileImage2?: Express.Multer.File[],
            profileImage3?: Express.Multer.File[],
            cvFile?: Express.Multer.File[],
            logoFile?: Express.Multer.File[],
            postalCardFile?: Express.Multer.File[],
            companyLogoFile?: Express.Multer.File[],
        }
    ): Promise<Partial<User> | null> {
        this.logger.debug(`Updating user with ID: ${id}`);
        this.logger.debug(`Update DTO: ${JSON.stringify(updateUserDto)}`);
        if (files) {
            this.logger.debug(`Files received: ${Object.keys(files).join(', ')}`);
        }

        const userToUpdate = await this.userModel.findById(id).exec();
        if (!userToUpdate) {
            this.logger.warn(`User update failed: ID not found - ${id}`);
            throw new NotFoundException(`User with ID "${id}" not found.`);
        }

        // Interdire la mise à jour du mot de passe via cette méthode
        if (updateUserDto.password) {
            this.logger.warn(`Attempt to update password for user ID: ${id} was blocked.`);
            throw new ConflictException('La modification du mot de passe n\'est pas autorisée via cette opération. Veuillez utiliser la fonction de réinitialisation de mot de passe.');
        }
        // Supprimer le champ password du DTO pour s'assurer qu'il n'est pas traité
        delete updateUserDto.password;


        // Gestion des uploads de fichiers
        const username = userToUpdate.username; // Utiliser le username pour le nom du dossier
        const userUploadDir = path.join('/upload', 'profile');

        if (!fs.existsSync(userUploadDir)) {
            fs.mkdirSync(userUploadDir, { recursive: true });
            console.log(`Created directory for user ${username}: ${userUploadDir}`);
        }

        const fileHandlingPromises = [];

        // Correction: logoFile (DTO) doit mettre à jour logo (entité)
        const processFile = async (fileField: keyof UpdateUserDto, fileArray?: Express.Multer.File[], entityFieldOverride?: string) => {
            if (fileArray && fileArray[0]) {
                const file = fileArray[0];
                if (!file.buffer || file.buffer.length === 0) {
                    this.logger.error(`File buffer is empty for field ${fileField} (user ${id})`);
                    return;
                }
                const ext = file.originalname.split('.').pop();
                const fileName = `${fileField}_${Date.now()}.${ext}`;
                const filePath = path.join(userUploadDir, fileName);

                try {
                    let finalBuffer = file.buffer;
                    // Suppression du fond pour les images de profil
                    if (fileField === 'profileImage1' || fileField === 'profileImage2' || fileField === 'profileImage3') {
                        const apiKey = process.env.REMOVE_BG_API_KEY;
                        if (apiKey) {
                          try {
                            finalBuffer = await removeBackground(file.buffer, apiKey);
                          } catch (err) {
                            this.logger.error(`remove.bg failed for ${fileField}: ${err.message}`);
                            // fallback: garder l'image originale
                          }
                        }
                    }
                    await fs.promises.writeFile(filePath, finalBuffer);
                    if (entityFieldOverride) {
                        (userToUpdate as any)[entityFieldOverride] = `/uploads/profile/${fileName}`;
                    } else {
                        (updateUserDto as any)[fileField] = `/uploads/profile/${fileName}`;
                    }
                    this.logger.log(`File ${fileName} saved to ${filePath} for user ${id}`);
                } catch (error) {
                    this.logger.error(`Failed to save file ${fileName} for user ${id}: ${error.message}`, error.stack);
                }
            }
        };

        if (files) {
            if (files.profileImage1) fileHandlingPromises.push(processFile('profileImage1', files.profileImage1));
            if (files.profileImage2) fileHandlingPromises.push(processFile('profileImage2', files.profileImage2));
            if (files.profileImage3) fileHandlingPromises.push(processFile('profileImage3', files.profileImage3));
            if (files.cvFile) fileHandlingPromises.push(processFile('cvFile', files.cvFile));
            if (files.logoFile) fileHandlingPromises.push(processFile('logoFile', files.logoFile, 'logo'));
            if (files.postalCardFile) fileHandlingPromises.push(processFile('postalCardFile', files.postalCardFile));
            if (files.companyLogoFile) fileHandlingPromises.push(processFile('companyLogoFile', files.companyLogoFile));
        }

        await Promise.all(fileHandlingPromises);

        // Appliquer les autres mises à jour du DTO
        // Object.assign(userToUpdate, updateUserDto); // Attention, cela peut écraser des champs non désirés si le DTO n'est pas propre

        // Mise à jour sélective des champs du DTO
        for (const key in updateUserDto) {
            if (updateUserDto.hasOwnProperty(key) && updateUserDto[key] !== undefined && updateUserDto[key] !== null && updateUserDto[key] !== '') {
                 // Ne pas mettre à jour l'email ici, gérer séparément si nécessaire avec vérification d'unicité
                if (key === 'email' && updateUserDto.email !== userToUpdate.email) {
                    this.logger.warn(`Attempt to update email for user ID: ${id} to ${updateUserDto.email} was blocked.`);
                    // Optionnel: lancer une exception ou ignorer la mise à jour de l'email
                    // throw new ConflictException('La modification de l\'adresse email n\'est pas autorisée directement.');
                    continue; // Ignore la mise à jour de l'email pour l'instant
                }
                (userToUpdate as any)[key] = updateUserDto[key];
            }
        }


        try {
            const updatedUser = await userToUpdate.save();
            this.logger.log(`User updated successfully for ID: ${id}`);
            const { password, ...safeUser } = updatedUser.toObject();
            return safeUser;
        } catch (error) {
            this.logger.error(`Error saving updated user with ID ${id}: ${error.message}`, error.stack);
            if (error.code === 11000) { // Erreur de duplicata MongoDB (ex: email)
                throw new ConflictException('Une erreur de conflit est survenue (par exemple, email déjà utilisé).');
            }
            throw error;
        }
    }

    /**
     * Trouve un utilisateur par son token de vérification d'email.
     * @param token Le token de vérification unique envoyé par email.
     * @returns Promise<User | null> L'utilisateur correspondant ou null si non trouvé.
     */
    async findByVerificationToken(token: string): Promise<User | null> {
        this.logger.debug(`Recherche d'un utilisateur avec le token de vérification: ${token}`);
        return this.userModel.findOne({ verificationToken: token }).exec();
    }

    /**
     * Supprime un utilisateur et toutes ses données liées (messages, paiements, etc.).
     * @param userId L'ID de l'utilisateur à supprimer.
     */
    async deleteUserAndRelatedData(userId: string): Promise<void> {
        const db = this.userModel.db;
        // Suppression des messages où l'utilisateur est sender ou recipient
        await db.collection('messages').deleteMany({ $or: [ { sender: userId }, { recipient: userId } ] });
        // Suppression des paiements liés à l'utilisateur
        await db.collection('payments').deleteMany({ user: userId });
        // Suppression des thèmes utilisateur
        await db.collection('userthemes').deleteMany({ user: userId });
        // Suppression des articles utilisateur
        await db.collection('userarticles').deleteMany({ user: userId });
        // Suppression des projets utilisateur
        await db.collection('userprojects').deleteMany({ user: userId });
        // Suppression des commentaires utilisateur
        await db.collection('comments').deleteMany({ user: userId });
        // Suppression des sites utilisateur
        await db.collection('sites').deleteMany({ user: userId });
        // Suppression des settings utilisateur
        await db.collection('settings').deleteMany({ user: userId });
        // Suppression des configs utilisateur
        await db.collection('configs').deleteMany({ user: userId });
        // Ajoutez ici d'autres suppressions liées si besoin
        // Suppression de l'utilisateur lui-même
        await this.userModel.findByIdAndDelete(userId).exec();
    }

    /**
     * Retourne tous les administrateurs (isAdmin=true), sans le champ password
     */
    async findAllAdmins(): Promise<any[]> {
        const admins = await this.userModel.find({ isAdmin: true }).select('-password').exec();
        const result = await Promise.all(admins.map(async (admin) => {
            const payment = await this.paymentModel.findOne({ client: admin._id }).sort({ createdAt: -1 });
            let subscriptionType = null, subscriptionStart = null, subscriptionEnd = null;
            if (payment) {
                subscriptionType = payment.planId === 1 ? 'Premium' : payment.planId === 2 ? 'Standard' : null;
                subscriptionStart = payment.createdAt;
                subscriptionEnd = new Date(new Date(payment.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
            }
            return {
                ...admin.toObject(),
                payment,
                subscriptionType,
                subscriptionStart,
                subscriptionEnd,
            };
        }));
        return result;
    }

    /**
     * Retourne un administrateur par ID (isAdmin=true), sans le champ password
     */
    async findAdminById(id: string): Promise<any | null> {
        const admin = await this.userModel.findOne({ _id: id, isAdmin: true }).select('-password').exec();
        if (!admin) return null;
        const payment = await this.paymentModel.findOne({ client: admin._id }).sort({ createdAt: -1 });
        let subscriptionType = null, subscriptionStart = null, subscriptionEnd = null;
        if (payment) {
            subscriptionType = payment.planId === 1 ? 'Premium' : payment.planId === 2 ? 'Standard' : null;
            subscriptionStart = payment.createdAt;
            subscriptionEnd = new Date(new Date(payment.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        return {
            ...admin.toObject(),
            payment,
            subscriptionType,
            subscriptionStart,
            subscriptionEnd,
        };
    }

    /**
     * Met à jour un administrateur (isAdmin=true), sans permettre la modification du mot de passe
     */
    async updateAdmin(id: string, updateUserDto: UpdateUserDto): Promise<any | null> {
        if (updateUserDto.password) {
            throw new ConflictException('La modification du mot de passe n\'est pas autorisée ici.');
        }
        delete updateUserDto.password;
        const admin = await this.userModel.findOneAndUpdate(
            { _id: id, isAdmin: true },
            { $set: updateUserDto },
            { new: true }
        ).select('-password').exec();
        if (!admin) throw new NotFoundException('Administrateur non trouvé');
        // Si l'abonnement est modifié, mettre à jour le paiement associé
        if (updateUserDto.subscriptionType || updateUserDto.subscriptionStart || updateUserDto.subscriptionEnd) {
            const payment = await this.paymentModel.findOne({ client: admin._id }).sort({ createdAt: -1 });
            if (payment) {
                if (updateUserDto.subscriptionType) {
                    payment.planId = updateUserDto.subscriptionType === 'Premium' ? 1 : updateUserDto.subscriptionType === 'Standard' ? 2 : payment.planId;
                }
                if (updateUserDto.subscriptionStart) {
                    payment.createdAt = new Date(updateUserDto.subscriptionStart);
                }
                await payment.save();
            }
        }
        return this.findAdminById(id);
    }

    /**
     * Supprime un administrateur (isAdmin=true) avec vérification du mot de passe de l'admin authentifié
     */
    async deleteAdmin(targetAdminId: string, password: string, currentAdminId: string): Promise<void> {
        // Vérifier le mot de passe de l'admin qui exécute la requête
        const currentAdmin = await this.userModel.findById(currentAdminId).exec();
        if (!currentAdmin || !currentAdmin.isAdmin) throw new NotFoundException('Administrateur authentifié non trouvé.');
        if (!currentAdmin.password) throw new ConflictException('Aucun mot de passe défini pour l’administrateur authentifié.');
        const isMatch = await bcrypt.compare(password, currentAdmin.password);
        if (!isMatch) throw new ConflictException('Mot de passe de confirmation incorrect.');
        // Supprimer l'admin ciblé
        const admin = await this.userModel.findOneAndDelete({ _id: targetAdminId, isAdmin: true }).exec();
        if (!admin) throw new NotFoundException('Administrateur à supprimer non trouvé');
        // Supprimer aussi le paiement associé
        await this.paymentModel.deleteMany({ client: admin._id });
        // Supprimer toutes les données liées à cet administrateur
        const db = this.userModel.db;
        await Promise.all([
            db.collection('messages').deleteMany({ $or: [ { sender: targetAdminId }, { recipient: targetAdminId } ] }),
            db.collection('payments').deleteMany({ user: targetAdminId }),
            db.collection('userthemes').deleteMany({ user: targetAdminId }),
            db.collection('userarticles').deleteMany({ user: targetAdminId }),
            db.collection('userprojects').deleteMany({ user: targetAdminId }),
            db.collection('comments').deleteMany({ user: targetAdminId }),
            db.collection('sites').deleteMany({ user: targetAdminId }),
            db.collection('settings').deleteMany({ user: targetAdminId }),
            db.collection('configs').deleteMany({ user: targetAdminId }),
            // Ajoutez ici d'autres suppressions liées si besoin
        ]);
    }

    // Ajoutez ici d'autres méthodes nécessaires pour la gestion des utilisateurs (update, delete, getAll, etc.)
    // Elles suivraient des patrons similaires en utilisant les méthodes du modèle Mongoose (findOneAndUpdate, findByIdAndDelete, find, etc.)

    // Exemple (conceptuel) de méthode de suppression
    // async remove(id: string): Promise<UserDocument | null> {
    //      const deletedUser = await this.userModel.findByIdAndDelete(id).exec();
    //      if (!deletedUser) {
    //           throw new NotFoundException(`User with ID "${id}" not found.`);
    //      }
    //      return deletedUser;
    // }
    async findByResetToken(token: string): Promise<User | null> {
        this.logger.debug(`Recherche d'un utilisateur avec le token de réinitialisation: ${token}`);
        return this.userModel.findOne({ resetToken: token }).exec();
    }        

    async setPasswordResetCode(email: string, code: string, expires: Date, newPassword: string): Promise<void> {
        await this.userModel.updateOne(
          { email },
          {
            $set: {
              passwordResetCode: code,
              passwordResetCodeExpires: expires,
              passwordResetNewPassword: newPassword,
            },
          }
        );
      }
    
      async updatePasswordAndClearReset(email: string, hashedPassword: string): Promise<void> {
        await this.userModel.updateOne(
          { email },
          {
            $set: { password: hashedPassword },
            $unset: {
              passwordResetCode: '',
              passwordResetCodeExpires: '',
              passwordResetNewPassword: '',
            },
          }
        );
      }
}
