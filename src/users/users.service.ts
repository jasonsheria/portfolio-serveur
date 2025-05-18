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

@Injectable()
export class UsersService {

    private readonly logger = new Logger(UsersService.name);

    // Injectez le modèle Mongoose pour l'entité User.
    // NestJS et Mongoose s'occupent de fournir l'instance correcte du modèle.
    // Le nom de la propriété injectée (ici userModel) est ce que vous utiliserez pour interagir avec la collection 'users'.
    constructor(@InjectModel(User.name) private userModel: Model<User>) {
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
            const profileDir = path.join(__dirname, '../../..', 'uploads', 'profile');
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
            // ... Ajoutez ici d'autres champs si besoin
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
     * @param updateData Les champs à mettre à jour (ex: profileUrl, username, etc.).
     * @returns Promise<Partial<User> | null> L'utilisateur mis à jour sans le mot de passe, ou null si non trouvé.
     * @throws NotFoundException si l'utilisateur n'existe pas.
     */
    async updateUser(id: string, updateData: Partial<User> & { profileFile?: any }): Promise<Partial<User> | null> {
        this.logger.debug(`Updating user with ID: ${id}`);
        this.logger.debug(`Update data: ${JSON.stringify({ ...updateData, profileFile: updateData.profileFile ? '[file]' : undefined })}`);

        // Gestion de la photo de profil si présente
        if (updateData.profileFile) {
            const file = updateData.profileFile;
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
            const fileName = `profile_${id}_${Date.now()}.${ext}`;
            const fs = require('fs');
            const path = require('path');
            const profileDir = path.join(__dirname, '../../..', 'uploads', 'profile');
            if (!fs.existsSync(profileDir)) {
                fs.mkdirSync(profileDir, { recursive: true });
            }
            const filePath = path.join(profileDir, fileName);
            fs.writeFileSync(filePath, file.buffer);
            // Stocker le chemin relatif pour le frontend
            updateData.profileUrl = `/uploads/profile/${fileName}`;
        }
        // Nettoyer l'objet updateData pour ne pas stocker le fichier lui-même
        if ('profileFile' in updateData) delete updateData.profileFile;

        // Interdire la mise à jour de l'email et du mot de passe via cette méthode
        if ('email' in updateData) {
            throw new NotFoundException('La modification de l\'adresse email n\'est pas autorisée via cette opération.');
        }
        if ('password' in updateData) {
            throw new NotFoundException('La modification du mot de passe n\'est pas autorisée via cette opération.');
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).exec();
        if (!updatedUser) {
            this.logger.warn(`User update failed: ID not found - ${id}`);
            throw new NotFoundException(`User with ID "${id}" not found.`);
        }
        const { password, ...safeUser } = updatedUser.toObject();
        return safeUser;
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
        await db.collection('usersites').deleteMany({ user: userId });
        // Suppression des settings utilisateur
        await db.collection('settings').deleteMany({ user: userId });
        // Suppression des configs utilisateur
        await db.collection('configs').deleteMany({ user: userId });
        // Ajoutez ici d'autres suppressions liées si besoin
        // Suppression de l'utilisateur lui-même
        await this.userModel.findByIdAndDelete(userId).exec();
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
}
