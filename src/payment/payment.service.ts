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
import { Model } from 'mongoose';
// Importez l'interface/type de votre document Mongoose User.
// Assurez-vous que le chemin et les noms (User, UserDocument) correspondent à votre fichier user.schema.ts
import { Payment } from '../entity/payment/payment.schema'; // Assurez-vous que le chemin est correct
import { CreatePaymentDto } from './dto/payment.dto'; // Assurez-vous que le chemin est correct
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Payment.name) private paymentModel: Model<Payment>,
         private usersService: UsersService, 
    ) {
            // L'ancienne simulation en mémoire (private readonly usersModel: Model<User>, this.usersModel = userModel,
            // ainsi que les références à this.users et this.nextId) a été retirée.
            // Toutes les opérations de base de données se feront maintenant via this.userModel.
        
        }
    
    // Example method to handle payment processing
        
    async processPayment(data: CreatePaymentDto): Promise<Payment> {
        // On extrait userId et on construit un nouvel objet sans userId mais avec client
        const { userId, amount, paymentMethod, ...rest } = data;
        Logger.log('Début processPayment', 'PaymentService');
        Logger.log('Payload reçu : ' + JSON.stringify(data), 'PaymentService');
        const user = await this.usersService.findById(userId);
        Logger.log('Résultat recherche user : ' + (user ? 'trouvé' : 'non trouvé'), 'PaymentService');

        if (!user) {
            Logger.warn('Utilisateur non trouvé, annulation paiement', 'PaymentService');
            return null;
        }
        if (amount <= 0) {
            Logger.warn('Montant <= 0, annulation paiement', 'PaymentService');
            throw new ConflictException('Le montant doit être supérieur à 0');
        }
        Logger.log('Création du paiement en base...', 'PaymentService');
        // On crée le paiement avec client (clé étrangère vers User)
        const payment = new this.paymentModel({ ...rest, amount, paymentMethod, client: user._id });
        await payment.save();
        Logger.log('Paiement enregistré avec succès : ' + JSON.stringify(payment), 'PaymentService');
        // Mettre à jour l'utilisateur si besoin (ex: isAdmin)
        try {
            const updatedUser = await this.userModel.findByIdAndUpdate(user._id, { isAdmin: true }, { new: true });
            Logger.log(`Utilisateur ${user._id} mis à jour : isAdmin=${updatedUser?.isAdmin}`, 'PaymentService');
        } catch (err) {
            Logger.error('Erreur lors de la mise à jour de isAdmin : ' + err, 'PaymentService');
        }
        return payment;
    }
    
    // Add more methods as needed for payment-related functionalities
    async getPayment(id: string): Promise<Payment> {
        const payment = await this.paymentModel.findById(id).exec();
        if (!payment) {
            throw new NotFoundException(`Payment with id ${id} not found`);
        }
        return payment;
    }
    async getAllPayments(): Promise<Payment[]> {
        return this.paymentModel.find().exec();
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
        const payments = await this.paymentModel.find({ userId }).exec();
        if (!payments) {
            throw new NotFoundException(`Payments for user with id ${userId} not found`);
        }
        return payments;
    }
}