import {
  Injectable,
  NotFoundException, // Utile pour les cas où un élément n'est pas trouvé
  ConflictException, // Utile pour les cas de duplication (email existant)
  Logger // Pour le logging
} from '@nestjs/common';
import {User} from '../entity/users/user.schema';
// Importez le décorateur InjectModel
import { InjectModel } from '@nestjs/mongoose';
// Importez le type Model de mongoose
import { Model, Types } from 'mongoose';
// Importez l'interface/type de votre document Mongoose User.
// Assurez-vous que le chemin et les noms (User, UserDocument) correspondent à votre fichier user.schema.ts
import { Payment } from '../entity/payment/payment.schema'; // Assurez-vous que le chemin est correct
import { CreatePaymentDto } from './dto/payment.dto'; // Assurez-vous que le chemin est correct
import { UsersService } from 'src/users/users.service';
import { Site } from '../entity/site/site.schema'; // Assurez-vous que le chemin est correct

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
        @InjectModel(Site.name) private siteModel: Model<Site>,
         private usersService: UsersService, 
    ) {
            // L'ancienne simulation en mémoire (private readonly usersModel: Model<User>, this.usersModel = userModel,
            // ainsi que les références à this.users et this.nextId) a été retirée.
            // Toutes les opérations de base de données se feront maintenant via this.userModel.
        
        }
    
    // Example method to handle payment processing
        
    async processPayment(data: CreatePaymentDto): Promise<Payment> {
        // On extrait userId, siteId (au lieu de projectId) et on construit un nouvel objet sans userId mais avec client et site
        const { userId, amount, paymentMethod, siteId, ...rest } = data;
        Logger.log('Début processPayment', 'PaymentService');
        Logger.log('Payload reçu : ' + JSON.stringify(data), 'PaymentService');
        const user = await this.usersService.findById(userId);
        Logger.log('Résultat recherche user : ' + (user ? 'trouvé' : 'non trouvé'), 'PaymentService');

        if (!user) {
            Logger.warn('Utilisateur non trouvé, annulation paiement', 'PaymentService');
            throw new NotFoundException('Utilisateur non trouvé');
        }
        if (amount <= 0) {
            Logger.warn('Montant <= 0, annulation paiement', 'PaymentService');
            throw new ConflictException('Le montant doit être supérieur à 0');
        }
        // Recherche du site lié à ce user
        Logger.log(`Recherche du site avec _id=${siteId} et user=${user._id}`, 'PaymentService');
        const siteById = await this.siteModel.findById(siteId);
        Logger.log(`Site trouvé par _id: ${JSON.stringify(siteById)}`, 'PaymentService');
        const site = await this.siteModel.findOne({ _id: siteId, user: user._id.toString() });
        if (!site) {
            Logger.warn('Site non trouvé ou n\'appartient pas à l\'utilisateur', 'PaymentService');
            throw new NotFoundException('Site non trouvé ou n\'appartient pas à cet utilisateur');
        }
        Logger.log('Création du paiement en base...', 'PaymentService');
        // On crée le paiement avec client (clé étrangère vers User) et site
        const payment = new this.paymentModel({ ...rest, amount, paymentMethod, client: user._id, site: site._id });
        await payment.save();
        Logger.log('Paiement enregistré avec succès : ' + JSON.stringify(payment), 'PaymentService');
        // Mettre à jour l'utilisateur si besoin (ex: isAdmin)
        try {
            const updatedUser = await this.userModel.findByIdAndUpdate(user._id, { isAdmin: true }, { new: true });
            Logger.log(`Utilisateur ${user._id} mis à jour : isAdmin=${updatedUser?.isAdmin}`, 'PaymentService');
        } catch (err) {
            Logger.error('Erreur lors de la mise à jour de isAdmin : ' + err, 'PaymentService');
        }
        // Retourne le paiement avec infos user et site
        return await this.paymentModel.findById(payment._id)
            .populate('client')
            .populate('site')
            .exec();
    }
    
    // Add more methods as needed for payment-related functionalities
    async getPayment(id: string): Promise<Payment> {
        const payment = await this.paymentModel.findById(id)
            .populate('client')
            .populate('site')
            .exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }
        return payment;
    }
    async getAllPayments(): Promise<Payment[]> {
        return this.paymentModel.find()
            .populate('client')
            .populate('site')
            .exec();
    }
    async deletePayment(id: string): Promise<Payment> {
        const payment = await this.paymentModel.findByIdAndDelete(id).exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }
        return payment;
    }
    async updatePayment(id: string, data: Partial<CreatePaymentDto>): Promise<Payment> {
        const payment = await this.paymentModel.findByIdAndUpdate(id, data, { new: true }).exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }   
        return payment;

    }
    async findByUserId(userId: string): Promise<Payment[]> {
        const payments = await this.paymentModel.find({ client: userId }).exec();
        if (!payments || payments.length === 0) {
            throw new NotFoundException(`Payments for user with id ${userId} not found`);
        }
        return payments;
    }
    async getPaymentBySite(siteId: string): Promise<Payment | null> {
        const site = await this.siteModel.findById(siteId);
        if (!site) {
            console.warn(`Site avec _id=${siteId} non trouvé`, 'PaymentService');
            throw new NotFoundException(`Site with id ${siteId} not found`);
        }
        // On recherche le paiement lié à ce site (cast siteId en ObjectId)
        const payment = await this.paymentModel.findOne({ site: new Types.ObjectId(siteId) })
            .populate('client')
            .populate('site')
            .exec();
        if (!payment) {
            console.warn(`Aucun paiement trouvé pour le site avec _id=${siteId}`, 'PaymentService');
            return null;
        }
        return payment;
         }
}